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
            background-color: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 16px !important;
            margin: 0 !important;
            max-width: 100% !important;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
            max-width: 800px;
            margin: 0 auto;
        }
        .empty-state h2 {
            color: var(--text-primary);
            margin-bottom: 12px;
            font-weight: 500;
        }
        .empty-state p {
            font-size: 16px;
            line-height: 1.6;
        }
        
        /* Suggestion chips */
        .suggestion-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            margin-top: 24px;
        }
        .suggestion-chip {
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 12px 20px;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 14px;
            max-width: 300px;
        }
        .suggestion-chip:hover {
            background-color: var(--border);
            border-color: var(--accent);
        }
        
        /* Temporary toggle */
        .temp-toggle-wrapper {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 8px 16px;
        }
        .temp-toggle-container {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        .temp-toggle-label {
            font-size: 14px;
            color: var(--text-secondary);
        }
        .temp-toggle-pill {
            width: 44px;
            height: 24px;
            border-radius: 12px;
            background: #424242;
            position: relative;
            transition: background 0.2s ease;
        }
        .temp-toggle-pill.active {
            background: #8b5cf6;
        }
        .temp-toggle-circle {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: transform 0.2s ease;
        }
        .temp-toggle-pill.active .temp-toggle-circle {
            transform: translateX(20px);
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    
    # Empty state when no messages - ChatGPT style with suggestion chips
    if len(st.session_state.chat_display) == 0:
        st.markdown(
            """
            <div class="empty-state">
                <h2>How can I help you today?</h2>
                <p>Ask me anything about CML, TKI medications, side effects, or lifestyle tips.</p>
                <div class="suggestion-chips">
                    <div class="suggestion-chip">What are the common side effects of Imatinib?</div>
                    <div class="suggestion-chip">How should I manage fatigue during TKI therapy?</div>
                    <div class="suggestion-chip">What foods should I avoid while taking TKIs?</div>
                    <div class="suggestion-chip">How often should I get my blood tested?</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    # Temporary Session Toggle (top-right corner of chat area) - ChatGPT style
    is_temp = st.session_state.get("is_temporary", False)
    active_class = "active" if is_temp else ""
    
    st.markdown(
        f"""
        <div class="temp-toggle-wrapper">
            <div class="temp-toggle-container">
                <span class="temp-toggle-label">Temporary</span>
                <div class="temp-toggle-pill {active_class}">
                    <div class="temp-toggle-circle"></div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    # Use a hidden button for the actual toggle functionality
    if st.button("Toggle", key="temp_toggle_header", help="Toggle temporary session", 
                 label_visibility="collapsed"):
        st.session_state.is_temporary = not st.session_state.is_temporary
        st.rerun()

    # 1. Render all messages in the chat session - borderless style
    for msg in st.session_state.chat_display:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # 2. Accept user input with theme-aware styling
    if user_question := st.chat_input("Message CML Assistant..."):
        
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