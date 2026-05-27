# Spec: VAT Chat - High-Fidelity Audio & Waveform Playback (Phase 1)

**Date:** 2026-05-27  
**Project:** Mission Control - VAT Chat  
**Status:** Approved  

---

## What We're Building

We are upgrading the local-first voice activity threshold (VAT) chat component in Mission Control with professional, Telegram-grade audio playback, seeking, speed selectors, and animated SVG waveforms. This eliminates boring native/hidden browser audio players, replacing them with a highly responsive and tactile visual layout.

---

## Requirements

### Must Have
- [ ] **Unified Audio Singleton Engine (`GlobalAudioProvider`)**: Ensures that playing one voice note immediately pauses and resets any other actively playing voice note (preventing overlapping audio streams).
- [ ] **Tactile SVG Waveform Components**:
  - Dynamically analyze and decode incoming voice message binaries (base64 or blob URLs) on-the-fly using the Web Audio API (`AudioContext.decodeAudioData`).
  - Render a clean, 32-to-40 bar SVG bar-graph waveform representing the absolute amplitude of the speech.
  - Highlight elapsed playback time by coloring the waveform bars from left to right in a deep accent color, leaving unplayed bars in muted gray.
- [ ] **Tactile Click-and-Drag Seeking**:
  - Clicking any region of the SVG waveform instantly seeks the audio to that percentage.
  - Drag-scrubbing across the waveform allows fluid, real-time audio seeking.
- [ ] **Playback Speed Toggles**:
  - A small, clean neomorphic badge cycling between `1.0x`, `1.5x`, and `2.0x` playback speeds.
- [ ] **Orb Minimization Indicator**:
  - Audio continues to play in the background when the chat popup is minimized to the Orb.
  - The minimized `VoiceOrb` displays a subtle animated playback ring or pulse indicating background audio activity.

### Nice to Have
- [ ] Client-side waveform caching (storing decoded amplitude graphs in an in-memory or IndexedDB cache to prevent repeated CPU decoding overhead when loading chat history).

### Out of Scope
- [ ] Multi-channel audio panning or editing.
- [ ] Permanent database migrations (we can pack duration/amplitude arrays directly into existing text payloads or decode client-side dynamically to prevent migration locking risks).

---

## Constraints

- **Compatibility**: Must work flawlessly over HTTP Tailscale connections across remote devices (i.e., Web Audio API decoding compatibility).
- **Latency**: Decoding audio data on-load must not block the main React render thread. Small clips (<10 seconds) should decode in <15ms.
- **UI System**: Strict compliance with the "Loosely Twisted" neomorphic Tailwind v4 styles.

---

## Acceptance Criteria

- [ ] Starting playback on Voice Message B instantly pauses Voice Message A and resets its progress.
- [ ] An interactive SVG waveform displays the actual high-contrast amplitude structure of loaded voice files.
- [ ] Clicking/dragging on the SVG waveform updates the audio cursor position accurately.
- [ ] Toggling the speed badge to `2.0x` plays the audio at double speed.
- [ ] Minimizing the popup to the Voice Orb while playing audio displays active visual pulsing on the Orb, and audio does not cut out.

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-05-27 | Use client-side Web Audio API decoding | Avoids database migrations during active dev while ensuring 100% accurate waveforms for both User and AI TTS messages. |
