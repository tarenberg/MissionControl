# Tasks: VAT Chat - High-Fidelity Audio & Waveform Playback (Phase 1)

**Date:** 2026-05-27  
**Spec:** `docs/vat-chat/spec_audio.md`  
**Plan:** `docs/vat-chat/plan_audio.md`  

---

## 📋 Task Checklist

### Phase 1: Core Audio Context Setup
- [ ] **Task 1.1**: Create `components/Chat/GlobalAudioProvider.tsx` implementing the React audio singleton provider.
- [ ] **Task 1.2**: Support central states for `playingId`, `isPlaying`, `currentTime`, `duration`, `playbackRate`, and global seek handlers.

### Phase 2: Waveform Decoder & Interactive Player Component
- [ ] **Task 2.1**: Create `components/Chat/AudioWaveform.tsx` featuring the Web Audio API decoder helper and standard multi-channel sample downsampling.
- [ ] **Task 2.2**: Wire SVG rendering for the 40-bar graph with dual color schemes (elapsed played indigo/unplayed gray).
- [ ] **Task 2.3**: Program mouse drag-and-click scrubbing listeners that translate coordinate index percentages to active play times in the global provider.

### Phase 3: Integration into VAT Chat Timeline
- [ ] **Task 3.1**: Inject `GlobalAudioProvider` wrapper inside the root of `components/Chat/ChatPopupV3.tsx` or `app/chat/page.tsx`.
- [ ] **Task 3.2**: Refactor voice chat timeline message rendering to mount the new `<AudioWaveform />` next to a standard play/pause button.
- [ ] **Task 3.3**: Mount the speed multiplier selector button (`1.0x` ➔ `1.5x` ➔ `2.0x`) directly in the bubble, updating the global playback speed context on click.

### Phase 4: Orb Active Playback indicator
- [ ] **Task 4.1**: Update `components/Chat/VoiceOrb.tsx` to handle background playback indicators.
- [ ] **Task 4.2**: Wrap minimized orb views to display a glowing circular radar pulse when the global player context is currently playing background voice clips.

---

## 📈 Verification Steps

- [ ] Check if the Next.js dev server builds with no TypeScript errors: `npx tsc --noEmit`.
- [ ] Play a voice note and verify it pauses any other playing voice notes instantly.
- [ ] Click and drag across different bars on the waveform and verify the audio seek matches.
- [ ] Toggle playback speed to `1.5x` and verify speed increases with no pitch alteration.
- [ ] Minimize the window to the Orb and check that background audio continues and renders the outer pulsing ring.
