import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log

try:
    from agent.rag_tool import search_medical_guidelines
except (ImportError, ModuleNotFoundError):
    from rag_tool import search_medical_guidelines

# Set up logging to observe retry attempts
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# 1. SETUP
# ==========================================
# Try loading from the current working directory, and also from the script's folder
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
# The client automatically looks for GEMINI_API_KEY in the environment
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@retry(
    retry=retry_if_exception_type(ServerError),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True
)
def generate_content_with_retry(client, model, contents):
    return client.models.generate_content(
        model=model,
        contents=contents
    )


# ==========================================
# 2. THE KNOWLEDGE BASE & TOOL (The "Hands")
# ==========================================
TKI_DATABASE = {
    "imatinib": {
        "brand_name": "Gleevec",
        "common_side_effects": ["nausea", "muscle cramps", "fluid retention", "fatigue"],
        "red_flags": ["severe weight gain", "shortness of breath"]
    },
    "dasatinib": {
        "brand_name": "Sprycel",
        "common_side_effects": ["headache", "diarrhea", "skin rash"],
        "red_flags": ["pleural effusion (fluid around lungs)", "chest pain", "bleeding"]
    }
}

def lookup_tki_info(drug_name: str) -> str:
    drug_name = drug_name.lower().strip()
    if drug_name in TKI_DATABASE:
        return json.dumps(TKI_DATABASE[drug_name])
    return json.dumps({"error": f"Drug '{drug_name}' not found."})

# --- NEW: Food Interactions Database ---
FOOD_INTERACTIONS_DB = {
    "imatinib": ["Take with food and a large glass of water to minimize stomach irritation.", "Avoid grapefruit (increases drug levels)."],
    "dasatinib": ["Can be taken with or without food.", "Avoid antacids (e.g., Tums, Maalox) 2 hours before and after taking.", "Avoid grapefruit."],
    "nilotinib": ["MUST be taken on an empty stomach (no food 2 hours before or 1 hour after).", "Taking with food can severely and dangerously increase drug levels.", "Avoid grapefruit."]
}

# --- NEW: The Second Tool ---
def lookup_food_interactions(drug_name: str) -> str:
    """Looks up dietary restrictions and food interactions for a TKI."""
    drug_name = drug_name.lower().strip()
    if drug_name in FOOD_INTERACTIONS_DB:
        return json.dumps({"drug": drug_name, "food_rules": FOOD_INTERACTIONS_DB[drug_name]})
    return json.dumps({"error": f"Drug '{drug_name}' not found for food interactions."})

# ==========================================
# 3. THE INTERACTIVE AGENT LOOP (With Memory)
# ==========================================
def chat_with_agent():
    print("Welcome to the CML Assistant. Type 'exit' to quit.\n")
    
    system_prompt = """
    You are a medical assistant for CML patients. You have access to THREE tools. 
    Depending on what the user asks, reply with ONLY a JSON object to trigger the correct tool:

    1. To look up specific side effects or red flags for a medication:
    {"tool": "lookup_tki_info", "drug_name": "generic_name"}

    2. To look up dietary restrictions or antacid rules:
    {"tool": "lookup_food_interactions", "drug_name": "generic_name"}
    
    3. To answer general questions about CML guidelines, treatments, or disease phases:
    {"tool": "search_medical_guidelines", "search_query": "the specific medical question to look up"}
    
    If you already have the data in the conversation history, reply directly in plain text.
    
    FORMATTING & CITATION RULES FOR FINAL RESPONSES:
    - ALWAYS use Markdown bullet points to make the information easy to read.
    - ALWAYS explicitly cite your source at the very end of your response. 
    - If you used a tool, cite the tool name (e.g., "*Source: TKI Side Effects Database*" or "*Source: Medical Guidelines PDF*").
    - Do not give dangerous medical advice. Tell the user to contact their doctor for red flags.
    """
    
    # 1. THIS IS OUR MEMORY. It starts with just the instructions.
    conversation_history = system_prompt 
    
    while True:
        # 2. Get user input
        user_question = input("\n[User]: ")
        if user_question.lower() in ['quit', 'exit']:
            print("Goodbye!")
            break
            
        # 3. Append the new question to our memory
        conversation_history += f"\n\nUser Question: {user_question}"
        
        # The ReAct Loop (Think -> Act -> Observe)
        for step in range(3): 
            
            # Note: Changed to a valid model name!
            response = generate_content_with_retry(
                client=client,
                model='gemini-3.6-flash', 
                contents=conversation_history # Pass the ENTIRE memory every time
            )

            llm_reply = response.text.strip()
            clean_reply = llm_reply.replace("```json", "").replace("```", "").strip()
            
            if clean_reply.startswith("{") and clean_reply.endswith("}"):
                print(f"  *(Agent thinking: {clean_reply})*")
                
                try:
                    action_data = json.loads(clean_reply)
                    tool_name = action_data.get("tool")
                    drug = action_data.get("drug_name")
                    
                    # ROUTE 1: Side Effects
                    if tool_name == "lookup_tki_info":
                        tool_result = lookup_tki_info(drug)
                        print(f"  *(Tool retrieved side effects for {drug})*")
                        # Append success and let the loop continue normally
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this data, provide the final response to the user."
                        
                    # ROUTE 2: Food Interactions
                    elif tool_name == "lookup_food_interactions":
                        tool_result = lookup_food_interactions(drug)
                        print(f"  *(Tool retrieved food rules for {drug})*")
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this data, provide the final response to the user."
                        
                    # ROUTE 3: RAG PDF Search (NEW!)
                    elif tool_name == "search_medical_guidelines":
                        query = action_data.get("search_query")
                        tool_result = search_medical_guidelines(query)
                        print(f"  *(Tool searched PDF for: '{query}')*")
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this PDF data, provide the final response to the user."
                        
                    # ROUTE 4: Hallucinated Tool (Error Correction)
                    else:
                        print(f"  *(Self-Correction: Agent tried to use invalid tool '{tool_name}')*")
                        error_msg = f"System Error: The tool '{tool_name}' does not exist. You may only use 'lookup_tki_info' or 'lookup_food_interactions'."
                        conversation_history += f"\n\n{error_msg}\nPlease try again using a valid tool."
                        continue # Skip to the next loop iteration so the LLM can try again
                        
                except json.JSONDecodeError as e:
                    # ROUTE 4: Broken JSON (Error Correction!)
                    print(f"  *(Self-Correction: Agent output invalid JSON)*")
                    error_msg = f"System Error: Failed to parse JSON. Error details: {str(e)}. Make sure you output ONLY raw JSON without missing brackets."
                    conversation_history += f"\n\n{error_msg}\nPlease fix your JSON format and try again."
                    continue # Skip to the next loop iteration so the LLM can fix its syntax
                    
            else:
                # 5. We have our final answer!
                print(f"\n[Agent]: {llm_reply}")
                
                # 6. CRUCIAL: Append the final answer to memory so it remembers its own reply!
                conversation_history += f"\n\nAgent Answer: {llm_reply}"
                break

# ==========================================
# 4. RUN THE CHAT
# ==========================================
if __name__ == "__main__":
    chat_with_agent()