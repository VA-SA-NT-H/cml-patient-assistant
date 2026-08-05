from fastapi import WebSocket, WebSocketDisconnect
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agent.agent import client, model_name
from agent.tools import lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia
from database import save_message
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

FORMATTING RULES:
- Use Markdown bullet points to present the information clearly.
- Explicitly cite your exact source (e.g., "Source: Wikipedia", "Source: Guidelines PDF", "Source: TKI Side Effects Database", "Source: Food Rules Database", or "Source: Patient's Lab Data") at the very end of your response.
"""

def get_patient_lab_data(test_type: str = None, date_range: str = None) -> dict:
    """Query patient's lab history for chatbot context."""
    from database import get_lab_results, get_treatments, get_milestones

    lab_results = get_lab_results(test_type)
    treatments = get_treatments()
    milestones = get_milestones()

    # Filter by date range
    if date_range and date_range != "all":
        now = datetime.now()
        if date_range == "latest":
            if lab_results:
                latest_date = max(r["test_date"] for r in lab_results)
                lab_results = [r for r in lab_results if r["test_date"] == latest_date]
        elif date_range.endswith("d"):
            days = int(date_range.replace("d", ""))
            cutoff = (now - timedelta(days=days)).strftime("%Y-%m-%d")
            lab_results = [r for r in lab_results if r["test_date"] >= cutoff]
        elif date_range.endswith("y"):
            years = int(date_range.replace("y", ""))
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


async def chat_websocket(websocket: WebSocket):
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
                
                # Build conversation history (simplified for now)
                contents = [user_message]
                
                # Process with Gemini
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=tools,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                )
                
                # Send thinking status
                await websocket.send_json({"type": "status", "content": "Thinking..."})
                
                # First model call
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                
                # Check for tool calls
                if response.function_calls:
                    for function_call in response.function_calls:
                        name = function_call.name
                        args = function_call.args
                        
                        # Send tool call status
                        await websocket.send_json({
                            "type": "tool_call",
                            "tool": name,
                            "args": args
                        })
                        
                        # Execute tool
                        tool_func = tools_map.get(name)
                        if tool_func:
                            tool_result = tool_func(**args)
                            await websocket.send_json({
                                "type": "tool_result",
                                "tool": name,
                                "result": str(tool_result)[:500]  # Limit result size
                            })
                            
                            # Add to conversation
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
                    model=model_name,
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