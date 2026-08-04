import streamlit as st
import time
from google.genai import types
from database import create_new_session, save_message

def render_chat_interface(client, model_name, tools, tools_map, system_instruction):
    """Renders the chat interface, handles message history, tool calling, and token streaming."""
    
    # Theme-aware chat styling
    st.markdown(
        """
        <style>
        [data-testid="stChatMessage"] {
            border-left: 3px solid var(--border) !important;
        }
        [data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {
            border-left-color: var(--accent) !important;
        }
        [data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-assistant"]) {
            border-left-color: #3b82f6 !important;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
        }
        .empty-state h2 {
            color: var(--text-primary);
            margin-bottom: 12px;
        }
        .empty-state p {
            font-size: 16px;
            line-height: 1.6;
        }
        .empty-state .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    
    # Empty state when no messages
    if len(st.session_state.chat_display) == 0:
        st.markdown(
            """
            <div class="empty-state">
                <div class="icon">💬</div>
                <h2>How can I help you today?</h2>
                <p>Ask me anything about CML, TKI medications, side effects, or lifestyle tips.</p>
            </div>
            """,
            unsafe_allow_html=True
        )

    # 1. Render all messages in the chat session
    for msg in st.session_state.chat_display:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # 2. Accept user input
    if user_question := st.chat_input("Ask a question about your medication..."):
        
        is_temp = st.session_state.get("is_temporary", False)

        # If this is the first message in a non-temporary session, initialize the session
        if not is_temp and len(st.session_state.chat_display) == 0:
            create_new_session(st.session_state.session_id, user_question[:30] + "...")

        # Show user message on screen
        with st.chat_message("user"):
            st.markdown(user_question)
        
        # Save to session state display
        st.session_state.chat_display.append({"role": "user", "content": user_question})
        
        # Save to database ONLY if NOT in temporary mode
        if not is_temp:
            save_message(st.session_state.session_id, "user", user_question)
        
        # Rebuild conversation history as Gemini Types Content objects
        contents = []
        for msg in st.session_state.chat_display:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
        
        # Process the Agent's response
        with st.chat_message("assistant"):
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=tools,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
            )
            
            # First model call to determine if function calling is required
            with st.spinner("Thinking..."):
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
            
            # Check if a tool needs to be executed
            if response.function_calls:
                for function_call in response.function_calls:
                    name = function_call.name
                    args = function_call.args
                    
                    # Show tool execution status in UI
                    with st.status(f"🔍 Accessing database: {name}...", expanded=True) as status:
                        tool_func = tools_map.get(name)
                        if tool_func:
                            tool_result = tool_func(**args)
                            status.write("Completed lookup. Found matching records.")
                            status.update(label=f"✅ Data retrieved via {name}", state="complete")
                        else:
                            tool_result = f"Error: Tool {name} not found."
                            status.update(label=f"❌ Error running {name}", state="error")
                        
                        # Append the function call model turn and function response tool turn to conversation
                        contents.append(response.candidates[0].content)
                        contents.append(types.Content(
                            role="tool",
                            parts=[types.Part.from_function_response(
                                name=name,
                                response={"result": tool_result}
                            )]
                        ))
                
                # Stream the final synthesized answer to the user in real-time
                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                
                full_response = st.write_stream((chunk.text for chunk in response_stream if chunk.text))
            else:
                # No tool was requested; stream the direct reply instantly
                def text_generator(text):
                    words = text.split(" ")
                    for i, word in enumerate(words):
                        yield word + (" " if i < len(words) - 1 else "")
                        time.sleep(0.01)
                
                full_response = st.write_stream(text_generator(response.text))
            
            # Save assistant message to session state display
            st.session_state.chat_display.append({"role": "assistant", "content": full_response})
            
            # Save to database ONLY if NOT in temporary mode
            if not is_temp:
                save_message(st.session_state.session_id, "assistant", full_response)
