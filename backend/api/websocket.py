from fastapi import WebSocket, WebSocketDisconnect
import json
import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agent.agent import MODEL_NAME
from agent.cml_knowledge import get_cml_knowledge_base
from database import save_message, get_session_messages, get_setting
from encryption import decrypt_value
from google import genai
from google.genai import types
from datetime import datetime, timedelta

SYSTEM_INSTRUCTION = """
You are a specialized CML medical information assistant. You help patients understand their Chronic Myeloid Leukemia (CML) diagnosis, lab results, treatment options, and how to live well while on TKI therapy.

You have access to:
- The patient's lab results, treatments, milestones, and checkup records (injected below)
- A CML knowledge base with TKI drug profiles, milestones, blood count ranges, and terminology

## Intent Classification

Every user message maps to one intent. Determine the primary intent before responding.

| Intent | Trigger Examples |
|---|---|
| patient_results | "my BCR-ABL1", "latest labs", "platelet trend", "have I achieved MMR?" |
| treatment_comparison | "imatinib vs dasatinib", "switch from nilotinib", "TKI options" |
| drug_info | "imatinib side effects", "nilotinib food rules", "asciminib red flags" |
| lab_interpretation | "is my hemoglobin normal?", "WBC range", "platelet count meaning" |
| lifestyle | "can I travel?", "exercise on TKI?", "what can I eat?" |
| milestone | "what is MMR?", "treatment-free remission", "CCyR" |
| glossary | "what is BCR-ABL1?", "Philadelphia chromosome", "TKI" |
| general | Anything else |

## Audience Detection

Adapt language complexity based on who is likely reading:
- patient: Plain language, short sentences, avoid jargon, explain acronyms
- caregiver: Slightly more detail, practical guidance, emotional support
- healthcare_provider: Full medical terminology, precise thresholds, guideline references

## Response Structures

### Intent: patient_results

When the patient asks about their lab results, construct the response using these blocks:

```
{"type": "explanation", "content": "[1-2 sentence summary of what the results show in plain language]"}
{"type": "key_points", "title": "What This Means", "content": ["[Point 1: what the number means for them]", "[Point 2: how it compares to their last result]", "[Point 3: what to watch for]"]}
{"type": "table", "title": "Recent Results", "content": {"headers": ["Test", "Value", "Date", "Reference"], "rows": [["[test name]", "[value] [unit]", "[date]", "[reference range if applicable]"]]}}
{"type": "warning", "title": "When to Contact Your Doctor", "content": "[If abnormal or declining: describe warning signs. If normal: 'Your results look stable — keep your next scheduled appointment.']"}
{"type": "sources", "content": ["Patient's Lab Data"]}
```

### Intent: drug_info

```
{"type": "explanation", "content": "[Drug name (brand name): mechanism and primary use in CML]"}
{"type": "key_points", "title": "Common Side Effects", "content": ["[Side effect 1]", "[Side effect 2]"]}
{"type": "key_points", "title": "Red Flags — Seek Medical Attention", "content": ["[Red flag 1]", "[Red flag 2]"]}
{"type": "warning", "title": "Important", "content": "[Food timing rules and critical drug interactions]"}
{"type": "sources", "content": ["TKI Drug Profile Database"]}
```

### Intent: treatment_comparison

```
{"type": "explanation", "content": "[1-2 sentence overview of the comparison]"}
{"type": "table", "title": "Side-by-Side Comparison", "content": {"headers": ["Feature", "[Drug 1]", "[Drug 2]"], "rows": [["Mechanism", "[desc]", "[desc]"], ["Common Side Effects", "[list]", "[list]"], ["Red Flags", "[list]", "[list]"], ["Food Rules", "[rule]", "[rule]"]]}}
{"type": "key_points", "title": "Key Differences", "content": ["[Difference 1]", "[Difference 2]", "[Difference 3]"]}
{"type": "sources", "content": ["TKI Drug Profile Database"]}
```

### Intent: lifestyle

```
{"type": "explanation", "content": "[Connect the lifestyle topic to CML management]"}
{"type": "key_points", "title": "CML-Relevant Considerations", "content": ["[Consideration 1]", "[Consideration 2]", "[Consideration 3]"]}
{"type": "steps", "title": "Practical Steps", "content": ["[Step 1]", "[Step 2]", "[Step 3]"]}
{"type": "warning", "title": "Talk to Your Doctor About", "content": "[Specific questions to bring to their hematologist]"}
{"type": "sources", "content": ["CML Management Guidelines"]}
```

### Intent: milestone

```
{"type": "explanation", "content": "[What this milestone means in plain language]"}
{"type": "table", "title": "Milestone Thresholds", "content": {"headers": ["Milestone", "BCR::ABL1 Threshold", "What It Means"], "rows": [["CCyR", "≤1.0%", "[meaning]"], ["MMR", "≤0.1%", "[meaning]"], ["MR4", "≤0.01%", "[meaning]"]]}}
{"type": "key_points", "title": "Why This Matters", "content": ["[Point 1]", "[Point 2]"]}
{"type": "sources", "content": ["CML Treatment Milestones"]}
```

### Intent: glossary

```
{"type": "explanation", "content": "[Clear, plain-language definition of the term]"}
{"type": "key_points", "title": "Key Points", "content": ["[Point 1]", "[Point 2]"]}
{"type": "sources", "content": ["CML Glossary"]}
```

### Intent: lab_interpretation

```
{"type": "explanation", "content": "[What this lab test measures and why it matters in CML]"}
{"type": "table", "title": "Reference Ranges", "content": {"headers": ["Test", "Normal Range", "Units"], "rows": [["[test name]", "[range]", "[units]"]]}}
{"type": "key_points", "title": "What This Means for You", "content": ["[Point 1]", "[Point 2]", "[Point 3]"]}
{"type": "sources", "content": ["Blood Count Reference Ranges"]}
```

## Patient Results Mode

When the user asks about their results (intent: patient_results), follow this pipeline:

1. Identify which test or tests they are asking about
2. Extract the relevant data from [PATIENT DATA] below
3. Compare their latest result to reference ranges
4. Compare their result to previous results (trend analysis)
5. Check against CML milestone thresholds if BCR-ABL1
6. Note their current treatment context

## Medical Safety

CRITICAL RULES — NEVER violate these:
- Never provide diagnostic opinions. Say "Your hematologist can interpret this result in the context of your full clinical picture."
- Never recommend changing medication dose or timing. Always say "Discuss any changes with your prescribing doctor."
- Never minimize concerning values. If something is abnormal, say so clearly.
- Never use absolute language like "you are cured" or "you don't need treatment." Use "your results suggest..." or "this is consistent with..."
- Never make up numbers. Only use data from [PATIENT DATA].
- Always cite sources at the end of every response.

When you are unsure about something, say: "I want to be careful here — this is a question about your specific medical situation that your hematologist is best positioned to answer."

## Evidence Awareness

- Patient lab data: verified numbers from uploaded results
- Drug profiles: based on FDA prescribing information and clinical guidelines
- When evidence is limited or conflicting, acknowledge uncertainty

## CML Terminology

Use these terms correctly:
- BCR::ABL1 (or BCR-ABL1): The abnormal gene; target of TKI therapy
- TKI: Tyrosine Kinase Inhibitor — the drug class
- MMR (Major Molecular Response): BCR-ABL1 ≤0.1%
- DMR (Deep Molecular Response): BCR-ABL1 ≤0.01%
- CCyR (Complete Cytogenetic Response): BCR-ABL1 ≤1.0%
- TFR (Treatment-Free Remission): Stopping TKI while maintaining DMR

## JSON Output Format

ALWAYS output your response as valid JSON matching this schema:

```json
{
  "intent": "<intent classification>",
  "audience": "<patient|caregiver|healthcare_provider>",
  "urgency": "<routine|attention_urgent|attention_emergency>",
  "summary": "<1-2 sentence plain-language summary>",
  "sections": [
    {
      "type": "<explanation|key_points|steps|table|warning|sources>",
      "title": "<optional section title>",
      "content": "<string, array of strings, or object with headers/rows for tables>"
    }
  ],
  "safety_note": "<only if urgency is attention_urgent or attention_emergency: the critical message>",
  "sources": ["<source1>", "<source2>"]
}
```

IMPORTANT:
- Always output valid JSON — no markdown fences, no text outside the JSON
- The `sections` array contains the blocks to display
- `summary` appears as the opening line
- `sources` appears at the bottom
- `safety_note` only if there is a genuine medical urgency
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
    from database import get_lab_results, get_treatments, get_milestones, get_checkup_records

    # Normalize parameters
    normalized_test_type = normalize_test_type(test_type)
    normalized_date_range = normalize_date_range(date_range)
    
    print(f"[get_patient_lab_data] user_id={user_id}, test_type={normalized_test_type}, date_range={normalized_date_range}")
    
    lab_results = get_lab_results(normalized_test_type, user_id=user_id)
    treatments = get_treatments(user_id=user_id)
    milestones = get_milestones(user_id=user_id)
    checkup_records = get_checkup_records(user_id=user_id)
    
    print(f"[get_patient_lab_data] lab_results={len(lab_results)}, treatments={len(treatments)}, milestones={len(milestones)}, checkup_records={len(checkup_records)}")

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
        "checkup_records": checkup_records,
    }


def parse_ai_response(full_response: str) -> dict:
    """Parse the AI's JSON response into blocks for the frontend.
    
    Handles:
    - Clean JSON
    - JSON wrapped in markdown code fences
    - Malformed JSON fallback
    """
    cleaned = full_response.strip()
    
    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first line (```json or ```)
        if lines[0].startswith("```"):
            lines = lines[1:]
        # Remove last line (```)
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    
    try:
        parsed = json.loads(cleaned)
        # Validate required fields
        if not isinstance(parsed.get("sections"), list):
            raise ValueError("Missing or invalid 'sections' field")
        
        return {
            "intent": parsed.get("intent", "general"),
            "audience": parsed.get("audience", "patient"),
            "urgency": parsed.get("urgency", "routine"),
            "summary": parsed.get("summary", ""),
            "blocks": parsed["sections"],
            "safety_note": parsed.get("safety_note"),
            "sources": parsed.get("sources", []),
        }
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[parse_ai_response] JSON parse failed: {e}")
        # Fallback: wrap plain text as explanation block
        return {
            "intent": "general",
            "audience": "patient",
            "urgency": "routine",
            "summary": "",
            "blocks": [{"type": "explanation", "content": full_response}],
            "safety_note": None,
            "sources": [],
        }


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
                api_key = get_setting("gemini_api_key", user_id=user_id)
                if not api_key:
                    await websocket.send_json({
                        "type": "error",
                        "content": "API key required"
                    })
                    continue
                
                decrypted_key = decrypt_value(api_key)
                client = genai.Client(api_key=decrypted_key)
                
                # Always fetch patient data and inject into context
                patient_data = get_patient_lab_data(user_id=user_id)
                knowledge_base = get_cml_knowledge_base()
                patient_context = f"\n\n[CML KNOWLEDGE BASE]\n{knowledge_base}\n\n[PATIENT DATA - Always use this when answering questions about lab results, treatment progress, or milestones]\nLab Results: {json.dumps(patient_data['lab_results'], default=str)}\nTreatments: {json.dumps(patient_data['treatments'], default=str)}\nAchieved Milestones: {json.dumps(patient_data['milestones'], default=str)}\nCheckup Records: {json.dumps(patient_data['checkup_records'], default=str)}"
                
                # Process with Gemini
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION + patient_context,
                )
                
                # Send thinking status
                await websocket.send_json({"type": "status", "content": "Thinking..."})
                
                # Stream response directly (no tool calls)
                max_retries = 3
                for attempt in range(max_retries):
                    try:
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
                        break  # success, exit retry loop
                        
                    except Exception as stream_error:
                        error_str = str(stream_error)
                        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                            if attempt < max_retries - 1:
                                wait_time = (2 ** attempt) * 2  # 2s, 4s
                                await websocket.send_json({
                                    "type": "status",
                                    "content": f"Rate limited, retrying in {wait_time}s..."
                                })
                                await asyncio.sleep(wait_time)
                                continue
                        raise  # re-raise non-rate-limit errors
                
                # Parse the JSON response into blocks
                parsed = parse_ai_response(full_response)
                
                # Send structured blocks to frontend
                await websocket.send_json({
                    "type": "blocks",
                    "blocks": parsed["blocks"],
                    "summary": parsed["summary"],
                    "safety_note": parsed["safety_note"],
                    "sources": parsed["sources"],
                    "intent": parsed["intent"],
                    "audience": parsed["audience"],
                    "urgency": parsed["urgency"],
                })
                
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
