import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log

try:
    from agent.tools import lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia
except (ImportError, ModuleNotFoundError):
    from tools import lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia

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
model_name = os.getenv("GEMINI_MODEL")
if not model_name:
    raise ValueError("GEMINI_MODEL environment variable is missing. Please set it in your .env file.")

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
# 2. THE INTERACTIVE AGENT LOOP (With Memory)
# ==========================================
def chat_with_agent():
    print("Welcome to the CML Assistant. Type 'exit' to quit.\n")
    
    system_prompt = """
    You are a medical assistant for CML patients. You have access to FOUR tools. 
    Depending on what the user asks, reply with ONLY a JSON object to trigger the correct tool:

    1. To look up specific side effects or red flags for a medication:
    {"tool": "lookup_tki_info", "drug_name": "generic_name"}

    2. To look up dietary restrictions or antacid rules:
    {"tool": "lookup_food_interactions", "drug_name": "generic_name"}
    
    3. To answer general questions about CML guidelines, treatments, or disease phases:
    {"tool": "search_medical_guidelines", "search_query": "the specific medical question to look up"}

    4. To look up general knowledge ONLY IF the guidelines PDF does not contain the answer:
    {"tool": "search_wikipedia", "search_query": "query"}
    
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
            
            response = generate_content_with_retry(
                client=client,
                model=model_name, 
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
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this data, provide the final response to the user."
                        
                    # ROUTE 2: Food Interactions
                    elif tool_name == "lookup_food_interactions":
                        tool_result = lookup_food_interactions(drug)
                        print(f"  *(Tool retrieved food rules for {drug})*")
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this data, provide the final response to the user."
                        
                    # ROUTE 3: RAG PDF Search
                    elif tool_name == "search_medical_guidelines":
                        query = action_data.get("search_query")
                        tool_result = search_medical_guidelines(query)
                        print(f"  *(Tool searched PDF for: '{query}')*")
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this PDF data, provide the final response to the user."
                        
                    # ROUTE 4: Wikipedia Search
                    elif tool_name == "search_wikipedia":
                        query = action_data.get("search_query")
                        tool_result = search_wikipedia(query)
                        print(f"  *(Tool searched Wikipedia for: '{query}')*")
                        conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this Wikipedia data, provide the final response to the user."
                        
                    # ROUTE 5: Hallucinated Tool (Error Correction)
                    else:
                        print(f"  *(Self-Correction: Agent tried to use invalid tool '{tool_name}')*")
                        error_msg = f"System Error: The tool '{tool_name}' does not exist. You may only use lookup_tki_info, lookup_food_interactions, search_medical_guidelines, or search_wikipedia."
                        conversation_history += f"\n\n{error_msg}\nPlease try again using a valid tool."
                        continue
                        
                except json.JSONDecodeError as e:
                    print(f"  *(Self-Correction: Agent output invalid JSON)*")
                    error_msg = f"System Error: Failed to parse JSON. Error details: {str(e)}. Make sure you output ONLY raw JSON without missing brackets."
                    conversation_history += f"\n\n{error_msg}\nPlease fix your JSON format and try again."
                    continue
                    
            else:
                # We have our final answer!
                print(f"\n[Agent]: {llm_reply}")
                conversation_history += f"\n\nAgent Answer: {llm_reply}"
                break

# ==========================================
# 3. RUN THE CHAT
# ==========================================
if __name__ == "__main__":
    chat_with_agent()