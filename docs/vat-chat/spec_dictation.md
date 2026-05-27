# Spec: VAT Chat Global Dictation Mode

## 1. Overview & Context
The **Global Dictation Mode** is a major product extension of the Voice Activity Threshold (VAT) Chat. It enables Tom to utilize the high-fidelity local Whisper STT server (`/api/chat/stt-preview`) as a system-wide "spoken keyboard" across all Mission Control interfaces (such as the Personal Journal, task inputs, search bars, and notes).

By leveraging the Next.js backend for STT instead of native browser API engines, we bypass browser-enforced HTTPS restrictions on Tailscale IP subnets, unlocking 100% reliable local voice-to-text dictation.

## 2. Core Functional Requirements

### A. Toggling & State
* **Dictation Toggle**: A prominent action button ( Microphone + Pencil 🎙️✍️ ) in the `ChatPopupV3` header to activate Dictation Mode.
* **Minimize-to-Orb**: Upon activation, the full chat container smoothly transitions (via sliding/fade animations) into a compact, floating **Dictation Orb** anchored in the bottom-right corner of the viewport.
* **Restore Chat**: A simple restore action on the Orb brings back the full VAT Chat container with previous chat history intact.

### B. Floating Dictation Orb UI
* **Tactile Design**: Conforms to the "Loosely Twisted" neomorphic system (translucent, soft glassmorphic backing, elegant round drop-shadows).
* **Voice Activity Visualization**: Integrates a micro-VoiceOrb or pulsing outer ring that reacts dynamically to voice decibel inputs, providing clear visual feedback when Whisper is processing speech.
* **Recording Trigger**: Supports the identical "press to submit" (push-to-talk) click-and-hold trigger as well as passive Voice Activity Threshold (VAT) automatic detection.

### C. Smart Focus-Locking & Input Injection
* **Prevent Focus Stealing**: All interactive buttons on the Dictation Orb MUST employ `onMouseDown={(e) => e.preventDefault()}`. This ensures that clicking or holding the Orb does not strip keyboard cursor focus away from the input element Tom is currently typing into.
* **Focus Tracker**: Keeps a running, reactive reference (`lastFocusedElementRef`) to the most recently active `HTMLInputElement` or `HTMLTextAreaElement` on the parent page.
* **Dynamic Cursor Injection**:
  * Inserts transcribed text strictly at the current cursor selection offset (`selectionStart`/`selectionEnd`).
  * **Real-time Streaming Previews**: Replaces the *previous preview segment* as the Whisper API continuously yields growing previews during speech, preventing duplicated text.
  * **Final Commitment**: Inserts the finalized transcript with proper casing and final punctuation on speech-end, and positions the cursor cleanly at the end of the new text.
* **Standard State Synchronization**: Triggers a native synthetic DOM `input` event on the target element. This ensures that parent React components (like the custom Markdown editor in the Personal Journal) instantly synchronize their internal state with the injected text.

---

## 3. User Interface States
1. **Full VAT Chat Popup**: Normal chat popup with standard messages and global header. Clicking the dictation toggle triggers a smooth transition.
2. **Minimized Dictation Orb**: A compact round bubble (`width: 56px`, `height: 56px`) with a floating microphone icon and an optional mic level wave animation.
3. **Orb Recording State**: Glowing neon border (green/cyan) pulsing with real-time decibel levels, floating near the bottom-right.

---

## 4. Technical Constraints & Security
* **Focus Preservation**: Absolutely no clicking actions on the Orb should move focus away from the active input.
* **DOM Compatibility**: Must support both generic `<input>` fields and multiline `<textarea>` elements.
* **Standard React Compatibility**: Standard HTML input dispatchers must be triggered so Next.js forms capture the injected text without requiring custom page-by-page integration.

---

## 5. Acceptance Criteria
* [ ] Dictation Mode toggle icon is visible in `ChatPopupV3` header.
* [ ] Full chat minimizes to a beautiful, floating round Orb on click.
* [ ] Interactive Orb buttons do not steal input focus when clicked.
* [ ] The Orb tracks the last focused textbox/textarea on the page.
* [ ] Speech previews are typed into the textbox in real-time without duplicating text.
* [ ] Final speech transcripts commit cleanly with correct cursor positioning.
* [ ] React-based text area forms (such as `/journal`) successfully preserve and save the typed dictation.
* [ ] Dictation Orb displays clear active/recording state animations.
