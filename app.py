import streamlit as st
import json
import os

# 1. IMPORT YOUR EXISTING TOOLS (The beauty of modular code!)
from agent.agent import (
    client, model_name, generate_content_with_retry,
    lookup_tki_info, lookup_food_interactions, search_wikipedia, search_medical_guidelines
)

# Set up the page UI
st.set_page_config(page_title="CML Assistant", page_icon="🩺")
st.title("🩺 CML Patient Assistant")
st.markdown("Ask me about side effects, food interactions, or CML guidelines.")

# ==========================================
# 2. INITIALIZE MEMORY (Session State)
# ==========================================
# We store the raw string for the LLM's brain
if "conversation_history" not in st.session_state:
    st.session_state.conversation_history = """
    You are a medical assistant for CML patients. You have access to FOUR tools. 
    Depending on what the user asks, reply with ONLY a JSON object to trigger the correct tool:

    1. To look up side effects or red flags: {"tool": "lookup_tki_info", "drug_name": "name"}
    2. To look up dietary restrictions: {"tool": "lookup_food_interactions", "drug_name": "name"}
    3. To search the official medical guidelines PDF: {"tool": "search_medical_guidelines", "search_query": "query"}
    4. To look up general knowledge ONLY IF the guidelines PDF does not contain the answer: {"tool": "search_wikipedia", "search_query": "query"}
    
    If you have the data, reply directly in plain text.
    FORMATTING RULES: Use Markdown bullet points. Explicitly cite your exact source (e.g., "Source: Wikipedia" or "Source: Guidelines PDF") at the end.
    """

# We store a cleaner list just to display the chat bubbles on the screen
if "chat_display" not in st.session_state:
    st.session_state.chat_display = []

# ==========================================
# 3. RENDER THE CHAT HISTORY
# ==========================================
for msg in st.session_state.chat_display:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# ==========================================
# 4. THE AGENT LOOP (Triggered by user input)
# ==========================================
if user_question := st.chat_input("Ask a question about your medication..."):
    
    # Show user message on screen and save to memory
    with st.chat_message("user"):
        st.markdown(user_question)
    
    st.session_state.chat_display.append({"role": "user", "content": user_question})
    st.session_state.conversation_history += f"\n\nUser Question: {user_question}"
    
    # Process the Agent's response
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            for step in range(3):
                response = generate_content_with_retry(
                    client=client,
                    model=model_name,
                    contents=st.session_state.conversation_history
                )
                
                llm_reply = response.text.strip()
                clean_reply = llm_reply.replace("```json", "").replace("```", "").strip()

                # DID IT USE A TOOL?
                if clean_reply.startswith("{") and clean_reply.endswith("}"):
                    try:
                        action_data = json.loads(clean_reply)
                        tool_name = action_data.get("tool")
                        
                        # ROUTE 1: Side Effects
                        if tool_name == "lookup_tki_info":
                            drug = action_data.get("drug_name")
                            tool_result = lookup_tki_info(drug)
                            st.session_state.conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this data, provide the final response to the user. Remember to use bullet points and cite your source."
                        
                        # ROUTE 2: Food Interactions
                        elif tool_name == "lookup_food_interactions":
                            drug = action_data.get("drug_name")
                            tool_result = lookup_food_interactions(drug)
                            st.session_state.conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this data, provide the final response to the user. Remember to use bullet points and cite your source."
                        
                        # ROUTE 3: RAG PDF Search
                        elif tool_name == "search_medical_guidelines":
                            query = action_data.get("search_query")
                            tool_result = search_medical_guidelines(query)
                            st.session_state.conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this PDF data, provide the final response to the user. Remember to cite the PDF."
                        
                        # ROUTE 4: Wikipedia Fallback
                        elif tool_name == "search_wikipedia":
                            query = action_data.get("search_query")
                            tool_result = search_wikipedia(query)
                            st.session_state.conversation_history += f"\n\nAgent Action: {clean_reply}\nTool Result: {tool_result}\nNow, based on this Wikipedia data, provide the final response. Cite Wikipedia as your source."
                            
                        # ROUTE 5: Hallucinated Tool
                        else:
                            st.session_state.conversation_history += f"\n\nSystem Error: Tool '{tool_name}' does not exist. Try again."
                            continue
                            
                    except json.JSONDecodeError as e:
                        st.session_state.conversation_history += f"\n\nSystem Error: Invalid JSON. {str(e)}. Try again."
                        continue
                        
                # IT HAS A FINAL ANSWER!
                else:
                    st.markdown(llm_reply) # Render the final markdown to the screen
                    
                    # Save the final answer to memory so it remembers for the next question
                    st.session_state.chat_display.append({"role": "assistant", "content": llm_reply})
                    st.session_state.conversation_history += f"\n\nAgent Answer: {llm_reply}"
                    break
    
