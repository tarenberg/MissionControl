# Plan: VAT Chat - High-Fidelity Audio & Waveform Playback (Phase 1)

**Date:** 2026-05-27  
**Status:** Approved  
**Spec:** `docs/vat-chat/spec_audio.md`

> Agent is READ-ONLY during this planning phase. No implementation files may be touched until Tom approves this plan.

---

## Approach

Our overall strategy is to bypass native browser `<audio>` controller styles entirely and replace them with a unified React Audio Context and interactive canvas/SVG visualizers. This aligns with standard high-performance chat layouts:

1. **Global Audio Provider**: Create `GlobalAudioContext` which hosts a single HTML `<audio>` element ref. By routing all playback through one central controller, we guarantee that only one audio clip can play at a time. It will manage:
   - `playingId`: ID of the active chat message playing.
   - `currentTime`: Current elapsed seconds.
   - `duration`: Total clip duration.
   - `playbackRate`: `1.0 | 1.5 | 2.0` speed.
2. **Web Audio Decoding**: Create a custom React hook `useAudioDecoder` or helper function `decodeWaveform` that:
   - Converts Base64 or Blob URLs into an array of bytes.
   - Decodes the bytes using `AudioContext.decodeAudioData` to retrieve the `AudioBuffer`.
   - Downsamples the buffer into a standardized array of 40 volume heights (between `0` and `1`).
   - Caches results in an in-memory `Map` to prevent repeated decoding CPU overhead during scrolling.
3. **Interactive SVG Waveform Player Component**:
   - Renders 40 vertical bars.
   - Bars are styled using Tailwind classes. Played bars are highlighted (e.g., `#3b82f6` or `#6366f1`); unplayed bars are muted gray.
   - Implements mouse-down, click, and touch scrub events to determine click-width percentages, trigger immediate seeking in the global audio player, and update `currentTime`.
4. **Orb Minimization Indicator**:
   - Sync the global audio provider's play state with the `VoiceOrb` component.
   - If audio is playing and the chat is minimized, set the state to `playing_background` and render a circular pulsing CSS SVG ring around the outer edge of the Orb to show active voice playing.

---

## Target Files

| File | Change Type | Notes |
|------|------------|-------|
| `components/Chat/GlobalAudioProvider.tsx` | New | High-efficiency context/provider managing singleton audio playback. |
| `components/Chat/AudioWaveform.tsx` | New | Interactive SVG visualizer decoding audio and handling drag seeking. |
| `components/Chat/ChatPopupV3.tsx` | Modify | Wrap with `GlobalAudioProvider` and replace manual `new Audio()` instances with the global player controls. |
| `components/Chat/VoiceOrb.tsx` | Modify | Add `playing_background` state rendering an outer animated radar-ring. |

---

## Technical Details & Code Patterns

### Web Audio Decoding Helper
```typescript
async function generateWaveform(audioSrc: string, numBars = 40): Promise<number[]> {
  const response = await fetch(audioSrc);
  const arrayBuffer = await response.arrayBuffer();
  
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const rawData = audioBuffer.getChannelData(0); // Channel 1 PCM samples
  
  const blockSize = Math.floor(rawData.length / numBars);
  const filteredData: number[] = [];
  
  for (let i = 0; i < numBars; i++) {
    let blockStart = blockSize * i;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[blockStart + j]);
    }
    filteredData.push(sum / blockSize);
  }
  
  // Normalize values between 0.1 and 1.0 for aesthetic consistency
  const maxVal = Math.max(...filteredData);
  return filteredData.map(v => Math.max(0.1, maxVal > 0 ? v / maxVal : 0.1));
}
```

### Neomorphic Waveform Layout
```tsx
<svg className="h-8 w-full flex items-end gap-[2px] overflow-hidden" viewBox="0 0 160 30">
  {waveform.map((height, i) => {
    const isPlayed = i / waveform.length < progressPercentage;
    return (
      <rect
        key={i}
        x={i * 4}
        y={30 - height * 26}
        width={2.5}
        height={height * 26}
        rx={1.2}
        className={`${isPlayed ? 'fill-indigo-500' : 'fill-gray-300 dark:fill-gray-600'} transition-colors duration-150`}
      />
    );
  })}
</svg>
```
