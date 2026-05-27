# Plan: VAT Chat Global Dictation Mode

## 1. Objectives & Dependency Analysis
We will implement **Global Dictation Mode** directly in the `ChatPopupV3.tsx` component. 

* **No focus-stealing**: We will design the Dictation Orb button triggers with `onMouseDown={(e) => e.preventDefault()}` so the focus remains locked in the parent page input fields.
* **Target Elements**: We will capture any `<input>` or `<textarea>` that receives a `focusin` event on the global `document` and store it in a React `useRef`.
* **State Sync**: We will trigger native `'input'` DOM events immediately after updating any value.
* **Safe Overwriting**: We will track `lastPreviewLengthRef.current` to seamlessly replace previous temporary preview segments as the Whisper live stream progresses.

## 2. File Modifying List
- `components/Chat/ChatPopupV3.tsx`

---

## 3. Implementation Steps

### Step 1: Add State & References
We will introduce the following states and refs inside `ChatPopupV3`:
```typescript
const [isDictationMode, setIsDictationMode] = useState(false);
const lastFocusedRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
const lastPreviewLengthRef = useRef<number>(0);
```

### Step 2: Global Focus Tracker
Implement a `focusin` document listener that runs globally:
```typescript
useEffect(() => {
  const handleFocusIn = () => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      lastFocusedRef.current = active as HTMLInputElement | HTMLTextAreaElement;
      console.log('Dictation: Focused input updated:', active.id || active.className);
    }
  };

  document.addEventListener('focusin', handleFocusIn);
  return () => document.removeEventListener('focusin', handleFocusIn);
}, []);
```

### Step 3: Text Injection Core Utility
Create a reusable text insertion routine that manipulates the cursor selection and fires native input events:
```typescript
const injectDictatedText = useCallback((newText: string, isPreview = false) => {
  const target = lastFocusedRef.current;
  if (!target) {
    console.warn('Dictation: No active textbox/textarea currently focused on page.');
    return;
  }

  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? 0;
  const originalVal = target.value;

  if (isPreview) {
    // Overwrite the previous preview text chunk
    const oldLen = lastPreviewLengthRef.current;
    const cleanVal = originalVal.substring(0, start - oldLen) + originalVal.substring(end);
    
    // Insert new preview text
    const updatedStart = start - oldLen;
    target.value = cleanVal.substring(0, updatedStart) + newText + cleanVal.substring(updatedStart);
    lastPreviewLengthRef.current = newText.length;
    
    // Position cursor at the end of the current preview
    target.selectionStart = target.selectionEnd = updatedStart + newText.length;
  } else {
    // Overwrite the last preview, insert the final text, and append a trailing space
    const oldLen = lastPreviewLengthRef.current;
    const cleanVal = originalVal.substring(0, start - oldLen) + originalVal.substring(end);
    
    const textToCommit = newText + ' ';
    const updatedStart = start - oldLen;
    target.value = cleanVal.substring(0, updatedStart) + textToCommit + cleanVal.substring(updatedStart);
    lastPreviewLengthRef.current = 0; // Reset preview length
    
    // Place cursor right after the committed text
    target.selectionStart = target.selectionEnd = updatedStart + textToCommit.length;
  }

  // Force React forms to capture the DOM change
  const event = new Event('input', { bubbles: true });
  target.dispatchEvent(event);
}, []);
```

### Step 4: Intercepting Voice Handlers
Modify `onTranscript`, `handlePreviewAudio`, and `onSpeechEnd` in `ChatPopupV3.tsx` to handle dictation redirection:
1. **`onTranscript`**:
   ```typescript
   onTranscript: (text) => {
     if (voiceMode !== 'press_to_submit') return;
     if (isDictationMode) {
       injectDictatedText(text || '', true);
     } else {
       draftTranscriptRef.current = text || '';
       setInput(text || '');
     }
   }
   ```
2. **`handlePreviewAudio`**:
   ```typescript
   // Inside handlePreviewAudio
   const previewText = (data?.text || '').trim();
   if (previewText) {
     if (isDictationMode) {
       injectDictatedText(previewText, true);
     } else {
       draftTranscriptRef.current = previewText;
       setInput(previewText);
     }
   }
   ```
3. **`onSpeechEnd`**:
   ```typescript
   // Inside onSpeechEnd (press_to_submit case)
   const finalText = text?.trim() || draftTranscriptRef.current.trim() || await transcribePreviewAudio(blob);
   if (finalText) {
     if (isDictationMode) {
       injectDictatedText(finalText, false);
     } else {
       draftTranscriptRef.current = finalText;
       setInput(finalText);
     }
   }
   ```

### Step 5: Interface Updates
1. **Header Toggle Button**: Add a neomorphic `PencilLine` or dictation indicator button right next to the minimize button in the Chat header.
2. **Orb Customization**:
   * If `isDictationMode` is active:
     - Render a sleek floating round bubble.
     - Center has a microphone icon.
     - Clicking/Holding triggers record state.
     - Displays a small hovering tooltip or button to easily restore the full chat window.
     - Prevent focus loss on active element during any clicking action inside this component.

---

## 4. Risks & Mitigations
* **Focus Stealing on Modal Load**: When the modal minimizes, ensure that `document.activeElement` doesn't accidentally blur. We will use passive transitions.
* **React State Desync**: Standard dispatching of the `'input'` event ensures fields like textareas managed by Next.js/React state handlers correctly update their data models.
