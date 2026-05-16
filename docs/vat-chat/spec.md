# Spec: VAT Chat (Voice Activity Threshold Chat)

## Overview
A local-first, privacy-focused chat interface integrated into Mission Control. It uses Tailscale for secure local networking and a Voice Activity Threshold (VAT) trigger to manage local voice processing (STT/TTS) without relying on external cloud APIs like Gemini or ElevenLabs.

## Goals
- **Local-First**: Operates strictly on the local network via Tailscale.
- **Resource Efficient**: VAT trigger ensures STT (Whisper) only runs when speech is detected above a certain dB threshold.
- **Privacy**: No external API calls for core chat/voice functionality.
- **Persistence**: Chat history stored in local SQLite (integrated with Mission Control).
- **Voice Stack**: Local Whisper (STT) and Piper (TTS).

## Constraints
- Must align with the "Loosely Twisted" design system (Tailwind CSS v4).
- Must port/migrate existing logic from `SyncMessenger` and `Muffin VoiceChat`.
- Must handle real-time sync across local devices.

## Acceptance Criteria
- [ ] Chat interface accessible via Mission Control on Tailscale.
- [ ] Voice input triggered by VAT (Voice Activity Threshold).
- [ ] Message history persists across sessions.
- [ ] Local STT/TTS loop functional.
- [ ] No external API calls made for messaging.

## Technical Architecture
- **Backend**: Next.js API routes + WebSocket (for real-time sync).
- **Database**: SQLite (via Prisma).
- **Voice**: 
    - STT: Local Whisper.cpp or similar.
    - VAD/VAT: Browser-based AudioWorklet or simple script to monitor decibels.
    - TTS: Local Piper.
- **Networking**: Tailscale for P2P/Local connectivity.
