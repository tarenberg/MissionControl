# Spec: VAT Chat (Voice Activity Threshold Chat)

## Overview
A local-first, privacy-focused chat interface integrated into Mission Control. It uses Tailscale for secure local networking and a Voice Activity Threshold (VAT) trigger to manage local voice processing (STT/TTS). Intelligence now runs through a shared inference layer with conversation context, local-first model routing, and optional hybrid escalation.

## Goals
- **Local-First**: Operates strictly on the local network via Tailscale.
- **Resource Efficient**: VAT trigger ensures STT (Whisper) only runs when speech is detected above a certain dB threshold.
- **Privacy**: Local-first inference by default with optional hybrid routing when explicitly enabled by environment.
- **Persistence**: Chat history stored in local SQLite (integrated with Mission Control).
- **Voice Stack**: Local Whisper (STT) and Piper (TTS).

## Constraints
- Must align with the "Loosely Twisted" design system (Tailwind CSS v4).
- Must port/migrate existing logic from `SyncMessenger` and `Muffin VoiceChat`.
- Must handle real-time sync across local devices.

## Acceptance Criteria
- [x] Chat interface accessible via Mission Control on Tailscale.
- [x] Voice input triggered by VAT (Voice Activity Threshold).
- [x] Message history persists across sessions.
- [x] Local STT/TTS loop functional.
- [x] Shared context-aware inference for text and voice routes.
- [x] Realtime sync via SSE channel updates.
- [ ] Full binary file attachment analysis pipeline (content extraction still pending).

## Technical Architecture
- **Backend**: Next.js API routes + SSE stream for real-time room updates.
- **Database**: SQLite (via Prisma).
- **Inference**:
    - Shared engine in `lib/chatEngine.ts`.
    - Includes recent turn window + compressed summary of older turns.
    - Local-first Ollama with optional Gemini fallback in hybrid mode (`VAT_CHAT_MODE=hybrid`).
- **Voice**: 
    - STT: Local Whisper.cpp or similar.
    - VAD/VAT: Browser-based script to monitor decibels.
    - TTS: Local Piper.
- **Networking**: Tailscale for P2P/Local connectivity.
