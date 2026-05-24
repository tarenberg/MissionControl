# Plan: VAT Chat Integration (Current)

## Phase 1: Core Platform (Completed)
1. **Rooms + Message Persistence**: SQLite-backed `ChatRoom` and `ChatMessage` APIs (Done).
2. **UI Foundation**: `/chat` and popup chat interfaces with shared message model (Done).
3. **Voice Path**: VAT trigger, local STT/TTS route integration (Done).

## Phase 2: Intelligence + Sync (Completed)
1. **Shared Inference Engine**: Consolidated text/voice generation in `lib/chatEngine.ts` (Done).
2. **Context-Aware Prompting**: Recent message window + compressed older-message summary (Done).
3. **Model Routing**: Local-first Ollama; optional hybrid Gemini fallback in env-configured mode (Done).
4. **Realtime Updates**: SSE endpoint at `/api/chat/events` and frontend subscriptions (Done).

## Phase 3: Product Hardening (In Progress)
1. **Attachments**: Added real chat file upload endpoint and assistant handoff (Done).
2. **Attachment Analysis**: Parse/extract file content server-side (Pending).
3. **Voice Reliability**: Migrate from browser-dependent speech recognition path toward worklet/streaming STT (Pending).
4. **Observability**: Add inference routing telemetry and latency/error dashboards (Pending).

## Target Files
- `app/chat/page.tsx`
- `components/Chat/ChatPopupV3.tsx`
- `app/api/chat/messages/route.ts`
- `app/api/chat/voice/route.ts`
- `app/api/chat/events/route.ts`
- `app/api/chat/upload/route.ts`
- `lib/chatEngine.ts`
