# Plan: VAT Chat Integration

## Phase 1: Infrastructure & Data Migration
1. **Initialize Directory**: Ensure `docs/vat-chat/` exists (Done).
2. **Database Schema**: Update `prisma/schema.prisma` to include `ChatMessage` and `ChatRoom` models.
3. **Port Logic**: Extract core messaging components from `SyncMessenger` and `VoiceChat` repos.
4. **Local WebSocket**: Set up a lightweight WebSocket server (or use Pusher-JS with a local mock) for real-time sync.

## Phase 2: VAT & Voice Engine
1. **VAT Logic**: Implement a basic decibel-monitoring hook in `useVAT.ts` (Done).
2. **STT Integration**: Connect the voice buffer to a local Whisper endpoint (`localhost:8000/stt`).
3. **TTS Integration**: Connect AI responses to a local Piper endpoint (`localhost:8000/tts`).
4. **Local AI Server**: Set up a FastAPI server running `faster-whisper` and `piper-tts`.
5. **UI Refinement**: Apply "Loosely Twisted" styling to the chat interface (Done).

## Phase 3: Testing & Hardening
1. **Tailscale Verification**: Test connection between laptop and mobile device on Tailscale.
2. **Privacy Audit**: Use Network tab to ensure no external AI API calls are made during chat.
3. **Stability**: Ensure WebSocket connection handles sleep/wake cycles gracefully.

## Target Files
- `MissionControl/app/chat/page.tsx` (New)
- `MissionControl/components/Chat/ChatBox.tsx` (New)
- `MissionControl/components/VoiceInterface.tsx` (Update)
- `MissionControl/prisma/schema.prisma` (Update)
- `MissionControl/lib/socket.ts` (New)
