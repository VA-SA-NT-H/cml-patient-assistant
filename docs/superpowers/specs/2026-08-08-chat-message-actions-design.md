# Chat Message Actions Design

**Date:** 2026-08-08  
**Status:** Approved  
**Scope:** Frontend + Backend message editing, deletion, and copying

## Overview

Add hover-activated actions to chat messages: copy for all messages, edit and delete for user messages only.

## User Stories

1. As a user, I can hover over my message to see copy, edit, and delete icons
2. As a user, I can hover over an AI reply to see a copy icon
3. As a user, I can delete my message and the AI's reply together
4. As a user, I can edit my message and get a new AI response
5. As a user, I can see an "edited" label on messages I've modified
6. As a user, I can copy any message to my clipboard

## Behavior Summary

| Message Type | Hover Shows | Actions |
|--------------|-------------|---------|
| User message | copy, edit, delete | All three |
| AI reply | copy | Copy only |

## Design Details

### Backend Changes

**Database:** Messages table already has `id` (SERIAL primary key). Return it in API responses.

**Modified endpoint:**
- `GET /api/sessions/{session_id}/messages` — now returns `id` alongside `role` and `content`

**New endpoints:**
- `PUT /api/sessions/{session_id}/messages/{message_id}` — update message content
- `DELETE /api/sessions/{session_id}/messages/{message_id}` — delete message + next AI reply

**Delete logic:** When deleting a user message at index `i`, also delete the AI reply at index `i+1` (if it exists and is from assistant).

### Frontend State

**Updated Message interface:**
```typescript
interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  edited?: boolean;
  blocks?: Block[];
  summary?: string;
  safety_note?: string | null;
  sources?: string[];
  urgency?: 'routine' | 'attention_urgent' | 'attention_emergency';
}
```

**New handler functions:**
- `handleDeleteMessage(messageId: number)` — calls backend, removes message pair
- `handleEditMessage(messageId: number, newContent: string)` — calls backend, marks edited, triggers new AI response

### ChatMessage Component

**New props:**
```typescript
interface ChatMessageProps {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  edited?: boolean;
  blocks?: Block[];
  // ... existing props
  onCopy: (content: string) => void;
  onEdit?: (messageId: number, newContent: string) => void;
  onDelete?: (messageId: number) => void;
}
```

**Hover behavior:**
- Icons appear on hover with fade transition
- User messages: right-aligned action row with copy, edit, delete
- AI replies: right-aligned copy icon only
- Icons have subtle background on hover

**Edit mode:**
- Click edit → text becomes editable TextField
- Save icon + Cancel icon appear
- Enter saves, Escape cancels
- "edited" label appears above message after save

**Copy behavior:**
- Click copy → copies content to clipboard
- Brief "Copied!" tooltip shown

### Edit Flow

1. User clicks edit on their message
2. Message becomes editable TextField with original text
3. User modifies text, clicks save (or Enter)
4. Frontend calls `PUT /api/sessions/{session_id}/messages/{message_id}`
5. Frontend marks message as `edited: true`
6. Frontend removes the old AI reply
7. Frontend calls `handleSendMessage(newContent)` for new AI response
8. "edited" label displays above message

### Delete Flow

1. User clicks delete on their message
2. Frontend calls `DELETE /api/sessions/{session_id}/messages/{message_id}`
3. Backend deletes user message + next AI reply
4. Frontend removes both messages from state

### Edge Cases

- If AI is currently responding (`isLoading`), disable edit/delete buttons
- If message has no `id` (optimistic state before backend confirms), disable actions
- Copy works on all messages regardless of loading state

## Files to Modify

- `backend/database.py` — add `update_message`, `delete_message_and_reply` functions
- `backend/api/routes.py` — add PUT/DELETE endpoints, return `id` in GET
- `frontend/src/App.tsx` — add handler functions, update Message interface
- `frontend/src/components/ChatMessage.tsx` — add hover actions, edit mode, copy

## Testing

1. Hover over user message → verify copy, edit, delete icons appear
2. Hover over AI reply → verify only copy icon appears
3. Click copy → verify content copied to clipboard
4. Click edit → verify message becomes editable
5. Edit and save → verify "edited" label appears and new AI response streams in
6. Click delete → verify both user message and AI reply are removed
7. Verify edit/delete disabled during AI response
8. Verify actions work in both light and dark mode
