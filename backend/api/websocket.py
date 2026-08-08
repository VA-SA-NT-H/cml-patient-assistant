from fastapi import WebSocket, WebSocketDisconnect
import json
import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agent.agent import MODEL_NAME
from agent.tools import lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia
from database import save_message, get_session_messages
from google.genai import types
from datetime import datetime, timedelta

SYSTEM_INSTRUCTION = """
CRITICAL ROLEPLAY RULE: You are a compassionate medical assistant and lifestyle companion for Chronic Myeloid Leukemia (CML) patients. 
Your primary directive is to relate EVERY user input back to CML, Tyrosine Kinase Inhibitor (TKI) treatments (like imatinib, dasatinib, nilotinib, bosutinib, ponatinib, or asciminib), or patient wellness.

- If the user asks about a medical or treatment topic, use your tools:
  - Side effects/red flags (lookup_tki_info)
  - Dietary/food rules (lookup_food_interactions)
  - Official CML guidelines PDF (search_medical_guidelines)
  - Patient's lab data (get_patient_lab_data)
  - General CML/leukemia knowledge via Wikipedia (search_wikipedia - ONLY if PDF fails)
- If the user asks about a seemingly unrelated topic (e.g., travel, exercise, stress, or general diet), DO NOT refuse. Instead, creatively find a clinical, practical, or lifestyle connection to living with CML. 
- For example: If they ask about traveling, relate it to maintaining strict daily TKI pill schedules across time zones or managing sun protection. If they ask about general stress, relate it to the emotional weight of living with a chronic condition or managing fatigue.
- Always gently guide the conversation back to supporting a CML patient safely, warmly, and empathetically.

When the user asks about their results, blood counts, or treatment progress, always use get_patient_lab_data to retrieve their actual data before responding. Never guess or make up numbers — only use verified data from the tool.

## LAB DATA TOOL USAGE GUIDE

When users ask about their lab results, blood counts, or treatment progress, 
you MUST use the `get_patient_lab_data` tool.

### Trigger Phrases (ALWAYS use the tool)
- "What was my last...?"
- "When was my...?"
- "How is my...?"
- "Show me my... trend"
- "Compare my... before and after..."
- "What's my latest result?"
- "Have I achieved...?"
- "What treatment am I on?"
- "My blood work / lab results / blood counts"
- Any question containing: WBC, platelets, hemoglobin, BCR-ABL1, PCR, blood count, lab result

### Tool Parameters
- `test_type` (optional): The lab test to query
- `date_range` (optional): Time range for results

### Parameter Mapping
| User says | test_type | date_range |
|-----------|-----------|------------|
| "my WBC" / "white blood cells" | "cbc_wbc" | (omit for all) |
| "my platelets" | "cbc_platelets" | (omit for all) |
| "my hemoglobin" / "Hgb" | "cbc_hemoglobin" | (omit for all) |
| "my BCR-ABL1" / "PCR" | "bcr_abl1" | (omit for all) |
| "last result" / "latest" | (omit) | "latest" |
| "last 30 days" | (omit) | "30d" |
| "last 6 months" | (omit) | "180d" |
| "all results" / "everything" | (omit) | (omit) |

### Response Patterns
- **Latest result:** "Your latest [test] was [value] [unit] on [date]."
- **Trend:** "Your [test] has [improved/stayed stable/declined] from [old] to [new] over [period]."
- **Milestone:** "You [have/have not] achieved [milestone] (threshold: [value])."
- **Treatment context:** "This was during your [drug] treatment at [dosage]."

### What NOT to do
- NEVER guess or make up numbers
- NEVER say "I don't have access to your data" — use the tool
- NEVER skip the tool when the user asks about their results

## EDGE CASES

### No Data Available
If the tool returns empty results or no data for the requested test:
- Say: "I don't see any [test] results on file yet. Would you like to upload your lab results?"
- NEVER guess or make up values

### Ambiguous Query
If the user says "my labs" or "my results" without specifying which test:
- Call `get_patient_lab_data()` with NO test_type parameter to get ALL results
- Summarize the most recent results across all test types
- Ask if they want details on a specific test

### Multiple Results Returned
If the tool returns multiple results for the same test:
- Show the most recent result first
- If the user asked for a trend, show all results in chronological order
- If the user asked for "latest", only show the most recent

### Treatment Context
When showing lab results, always include treatment context if available:
- "This was during your [drug] treatment at [dosage] mg."
- If no treatment is active, note: "No active treatment recorded."

### Milestone Questions
When asked about milestones (CCYR, MMR, MR4, MR4.5):
- Call `get_patient_lab_data()` with test_type "bcr_abl1"
- Compare the latest BCR-ABL1 value against the milestone threshold
- State clearly whether the milestone has been achieved

## RESPONSE FORMATTING FOR LAB DATA

### Single Result Format
```
Your latest [Test Name] was [Value] [Unit] on [Date].

[Optional: Treatment context line]
```

### Trend Format (multiple results over time)
```
**[Test Name] Trend:**
- [Date]: [Value] [Unit]
- [Date]: [Value] [Unit]
- [Date]: [Value] [Unit]

[Analysis: improved/stable/declined + context]
```

### Milestone Format
```
**Milestone Status:**
- CCYR (≤1.0%): [Achieved ✓ / Not achieved ✗] — Your BCR-ABL1: [Value]%
- MMR (≤0.1%): [Achieved ✓ / Not achieved ✗] — Your BCR-ABL1: [Value]%
```

### Treatment + Lab Correlation Format
```
Your [Test Name] was [Value] [Unit] on [Date].
This was during your [Drug Name] treatment at [Dosage] mg ([Start Date] to [End Date]).
```

### Always Cite Source
End every lab data response with:
```
Source: Patient's Lab Data
```

FORMATTING RULES:
- Use Markdown bullet points to present the information clearly.
- Explicitly cite your exact source (e.g., "Source: Wikipedia", "Source: Guidelines PDF", "Source: TKI Side Effects Database", "Source: Food Rules Database", or "Source: Patient's Lab Data") at the very end of your response.
"""

def normalize_test_type(test_type: str) -> str:
    """Normalize test type names from model to database format."""
    if not test_type:
        return None
    
    test_type_lower = test_type.lower().strip()
    
    # Map common variations to database test_type
    mappings = {
        "wbc": "cbc_wbc",
        "white blood cell": "cbc_wbc",
        "white blood cells": "cbc_wbc",
        "platelet": "cbc_platelets",
        "platelets": "cbc_platelets",
        "hemoglobin": "cbc_hemoglobin",
        "hgb": "cbc_hemoglobin",
        "hb": "cbc_hemoglobin",
        "bcr-abl": "bcr_abl1",
        "bcr_abl": "bcr_abl1",
        "bcrabl": "bcr_abl1",
        "bcr-abl1": "bcr_abl1",
    }
    
    return mappings.get(test_type_lower, test_type_lower)


def normalize_date_range(date_range: str) -> str:
    """Normalize date range from model to expected format."""
    if not date_range:
        return None
    
    date_range_lower = date_range.lower().strip()
    
    # Handle "latest"
    if date_range_lower == "latest":
        return "latest"
    
    # Handle "last X days/months/years"
    import re
    match = re.match(r"last\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)", date_range_lower)
    if match:
        num = int(match.group(1))
        unit = match.group(2)
        
        if unit.startswith("day"):
            return f"{num}d"
        elif unit.startswith("week"):
            return f"{num * 7}d"
        elif unit.startswith("month"):
            return f"{num * 30}d"
        elif unit.startswith("year"):
            return f"{num}y"
    
    # Handle "Xm" format (minutes)
    if date_range_lower.endswith("m"):
        return date_range_lower
    
    # Handle "Xd" format (days)
    if date_range_lower.endswith("d"):
        return date_range_lower
    
    # Handle "Xy" format (years)
    if date_range_lower.endswith("y"):
        return date_range_lower
    
    # Default: treat as days if it's a number
    if date_range_lower.isdigit():
        return f"{date_range_lower}d"
    
    return date_range_lower


def get_patient_lab_data(test_type: str = None, date_range: str = None, user_id: str = None) -> dict:
    """Query patient's lab history for chatbot context."""
    from database import get_lab_results, get_treatments, get_milestones

    # Normalize parameters
    normalized_test_type = normalize_test_type(test_type)
    normalized_date_range = normalize_date_range(date_range)
    
    print(f"[get_patient_lab_data] user_id={user_id}, test_type={normalized_test_type}, date_range={normalized_date_range}")
    
    lab_results = get_lab_results(normalized_test_type, user_id=user_id)
    treatments = get_treatments(user_id=user_id)
    milestones = get_milestones(user_id=user_id)
    
    print(f"[get_patient_lab_data] lab_results={len(lab_results)}, treatments={len(treatments)}, milestones={len(milestones)}")

    # Filter by date range
    if normalized_date_range and normalized_date_range != "all":
        now = datetime.now()
        if normalized_date_range == "latest":
            if lab_results:
                latest_date = max(r["test_date"] for r in lab_results)
                lab_results = [r for r in lab_results if r["test_date"] == latest_date]
        elif normalized_date_range.endswith("d"):
            days = int(normalized_date_range.replace("d", ""))
            cutoff = (now - timedelta(days=days)).strftime("%Y-%m-%d")
            lab_results = [r for r in lab_results if r["test_date"] >= cutoff]
        elif normalized_date_range.endswith("y"):
            years = int(normalized_date_range.replace("y", ""))
            cutoff = (now - timedelta(days=years * 365)).strftime("%Y-%m-%d")
            lab_results = [r for r in lab_results if r["test_date"] >= cutoff]

    return {
        "lab_results": lab_results,
        "treatments": treatments,
        "milestones": [m for m in milestones if m["achieved"]],
    }

tools_map = {
    "lookup_tki_info": lookup_tki_info,
    "lookup_food_interactions": lookup_food_interactions,
    "search_medical_guidelines": search_medical_guidelines,
    "search_wikipedia": search_wikipedia,
    "get_patient_lab_data": get_patient_lab_data,
}

tools = [lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia, get_patient_lab_data]


async def chat_websocket(websocket: WebSocket, user_id: str):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                session_id = message_data.get("session_id")
                user_message = message_data.get("message")
                
                # Save user message to database
                if session_id and user_message:
                    save_message(session_id, "user", user_message)
                
                # Build conversation history from database
                contents = []
                if session_id:
                    history = get_session_messages(session_id)
                    for msg in history:
                        role = "user" if msg["role"] == "user" else "model"
                        contents.append(types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg["content"])]
                        ))
                else:
                    contents.append(types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=user_message)]
                    ))
                
                # Get user's API key
                from database import get_setting
                from encryption import decrypt_value
                api_key = get_setting("gemini_api_key", user_id=user_id)
                if not api_key:
                    await websocket.send_json({
                        "type": "error",
                        "content": "API key required"
                    })
                    continue
                
                decrypted_key = decrypt_value(api_key)
                from google import genai
                client = genai.Client(api_key=decrypted_key)
                
                # Process with Gemini
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=tools,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                )
                
                # Send thinking status
                await websocket.send_json({"type": "status", "content": "Thinking..."})
                
                # Loop: handle tool calls until model returns text
                for _ in range(5):  # max 5 tool call rounds
                    response = client.models.generate_content(
                        model=MODEL_NAME,
                        contents=contents,
                        config=config
                    )
                    
                    if not response.function_calls:
                        break  # no tool calls, we have text
                    
                    for function_call in response.function_calls:
                        name = function_call.name
                        args = function_call.args
                        
                        # Add user_id to lab data tool calls
                        if name == "get_patient_lab_data":
                            args["user_id"] = user_id
                        
                        await websocket.send_json({
                            "type": "tool_call",
                            "tool": name,
                            "args": args
                        })
                        
                        tool_func = tools_map.get(name)
                        if tool_func:
                            tool_result = await asyncio.to_thread(tool_func, **args)
                            await websocket.send_json({
                                "type": "tool_result",
                                "tool": name,
                                "result": str(tool_result)[:500]
                            })
                            
                            contents.append(response.candidates[0].content)
                            contents.append(types.Content(
                                role="tool",
                                parts=[types.Part.from_function_response(
                                    name=name,
                                    response={"result": tool_result}
                                )]
                            ))
                
                # Stream final response
                await websocket.send_json({"type": "status", "content": "Generating response..."})
                
                response_stream = client.models.generate_content_stream(
                    model=MODEL_NAME,
                    contents=contents,
                    config=config
                )
                
                full_response = ""
                for chunk in response_stream:
                    if chunk.text:
                        await websocket.send_json({
                            "type": "token",
                            "content": chunk.text
                        })
                        full_response += chunk.text
                
                # Send completion
                await websocket.send_json({
                    "type": "complete",
                    "full_response": full_response
                })
                
                # Save assistant response to database
                if session_id and full_response:
                    save_message(session_id, "assistant", full_response)
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })