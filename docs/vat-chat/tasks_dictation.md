# Tasks: VAT Chat Global Dictation Mode

- [x] **Task 1: Dictation States & References** (Completed ✅)
  - Add state `isDictationMode` (default: false) in `components/Chat/ChatPopupV3.tsx`.
  - Add refs `lastFocusedRef` and `lastPreviewLengthRef` to track target elements and preview lengths.

- [x] **Task 2: Focus Tracker Implementation** (Completed ✅)
  - Add global `focusin` document event listener in `useEffect` to capture the last active input/textarea.

- [x] **Task 3: Cursor Insertion Utility (`injectDictatedText`)** (Completed ✅)
  - Code the core text insertion logic using `selectionStart` and `selectionEnd`.
  - Add preview chunk overwrite subtraction using `lastPreviewLengthRef`.
  - Dispatch a synthetic `input` event on the target DOM node to force React state sync.

- [x] **Task 4: Speech Callback Interception** (Completed ✅)
  - Route Whisper results in `onTranscript` through `injectDictatedText(text, true)` if `isDictationMode` is active.
  - Route Whisper results in `handlePreviewAudio` through `injectDictatedText(previewText, true)` if `isDictationMode` is active.
  - Route final Whisper results in `onSpeechEnd` through `injectDictatedText(finalText, false)` if `isDictationMode` is active.

- [x] **Task 5: Header Toggle Button** (Completed ✅)
  - Add a beautiful Neomorphic Dictation button in the `ChatPopupV3` header to activate/deactivate Dictation Mode.

- [x] **Task 6: Dictation Orb Customization & Hover Controls** (Completed ✅)
  - Update the minimized rendering state in `ChatPopupV3.tsx`.
  - Provide a floating round orb interface with a pulsing VoiceOrb.
  - Create a "Restore" button or click-to-expand mechanism.
  - Wrap any click handlers in `onMouseDown={(e) => e.preventDefault()}` to keep the parent element focused.

- [x] **Task 7: Build & Verify Compilation** (Completed ✅)
  - Verify that there are no syntax or type errors in the compiled build using `npx tsc --noEmit`.
