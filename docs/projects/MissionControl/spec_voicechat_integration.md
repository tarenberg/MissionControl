# Spec: VoiceChat Integration for Mission Control

## Overview
Integrate the standalone "VoiceChat" full-duplex audio pipeline into the Mission Control dashboard to provide a hands-free, low-latency communication interface between Tom and Muffin.

## Requirements
1. **Full-Duplex Communication**: Users should be able to speak and listen simultaneously using the Gemini 2.5 Flash Live Audio API.
2. **Visual Feedback**: Integrate the animated "Voice Orb" that reflects listening, speaking, and idle states.
3. **Workspace Context**: The voice interface must have access to the current Mission Control context (docs, memory, art deadlines).
4. **Hands-Free Operation**: Voice-activated or "always-listening" mode (optional, but preferred for studio work).
5. **Mobile Accessibility**: Must work via the Mission Control web interface on mobile devices.

## UI/UX Design
- **Placement**: A persistent, floating Voice Orb in the bottom-right corner of the dashboard, or a dedicated "Comms" side panel.
- **Vibe**: Neomorphic "Loosely Twisted" style.
- **States**:
  - **Idle**: Subtle pulse, waiting for connection.
  - **Listening**: Blue glow, reacting to mic input.
  - **Speaking**: Purple pulse, scaling with AI audio intensity.
  - **Connecting**: Rotating gradient.

## Technical Architecture
- **API**: `gemini-2.5-flash-native-audio-preview` via WebSocket.
- **Audio Pipeline**: PCM16 (16kHz) for mic capture; PCM16 (24kHz) for playback.
- **State Management**: React state within the Mission Control frontend, synchronized with the Gemini WebSocket.
- **Context Injection**: Use a `SYSTEM_INSTRUCTION` that includes real-time data from the Mission Control SQLite database and workspace files.

## Acceptance Criteria
- [ ] Voice Orb renders and animates correctly in Mission Control.
- [ ] Successful bidirectional audio stream established with Gemini.
- [ ] AI can correctly answer questions about the "Anchor Bar" caption or art deadlines via voice.
- [ ] Audio remains clear and low-latency over the local network (Tailscale).

## Constraints
- Requires HTTPS (already handled by the MC dev server setup).
- Requires a valid Gemini API Key (already in `.env`).
