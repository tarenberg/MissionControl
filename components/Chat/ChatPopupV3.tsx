'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, X, User, Bot, Volume2, VolumeX, Minimize2, GripHorizontal } from 'lucide-react';
import VoiceOrb, { OrbState } from './VoiceOrb';
import { useVAT } from '@/hooks/useVAT';
import { useGeminiLiveV7, GeminiLiveState } from '@/hooks/useGeminiLiveV7';
import { useRouter } from 'next/navigation';

const GEMINI_API_KEY = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();

// Log for debugging (remove in prod)
if (typeof window !== 'undefined') {
  console.log('ChatPopupV3: Gemini Key Status:', GEMINI_API_KEY ? `Present (len ${GEMINI_API_KEY.length})` : 'Missing');
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

export default function ChatPopupV3() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const orbStateRef = useRef<OrbState>('idle');
  useEffect(() => { orbStateRef.current = orbState; }, [orbState]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const executedMsgIdsRef = useRef<Set<string>>(new Set());

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const playLastAudio = () => {
    // If we're idle, try to force-start recording as a fallback
    if (orbState === 'idle' && isVATActive) {
      console.log('VAT: Force starting recording via click');
      setOrbState('listening');
      startRecording();
      return;
    }

    if (lastAudio) {
      const audio = new Audio(lastAudio);
      audio.play().catch(e => console.error('Manual playback failed:', e));
    }
  };

  const [liveError, setLiveError] = useState<string | null>(null);

  // Gemini Live Hook (Full Duplex)
  const { state: liveState, toggle: toggleLive, connected: isLiveConnected, error: geminiError } = useGeminiLiveV7({
    apiKey: GEMINI_API_KEY,
    onMessage: (role, content) => {
      // Log for debugging
      console.log(`Gemini ${role}:`, content);
      
      const cleanContent = content.replace(/\[\[ACTION:.*?\]\]/g, '').trim();
      if (!cleanContent) return;

      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.content === cleanContent && lastMsg.role === role) return prev;
        return [...prev, { id: Math.random().toString(36).substring(7), content: cleanContent, role, createdAt: new Date() }];
      });

      // Save live assistant message to SQLite database
      if (roomIdRef.current) {
        fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: cleanContent,
            role,
            roomId: roomIdRef.current,
            triggerLLM: false
          })
        }).catch(err => console.error('Failed to save live assistant message:', err));
      }
    },
    onAction: (action) => executeAction(action),
    onUserSpeech: async (blob) => {
      if (!roomIdRef.current) return;
      console.log('VAT Chat: Live voice speech turn finished. Transcribing user audio silently...');
      
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('roomId', roomIdRef.current);
      formData.append('triggerLLM', 'false'); // Silently transcribe & save in SQLite

      try {
        const res = await fetch('/api/chat/voice', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.userMsg) {
            console.log('VAT Chat: Live voice user message transcribed and saved:', data.userMsg.content);
            setMessages(prev => {
              // Avoid duplicate messages
              if (prev.some(m => m.id === data.userMsg.id || m.content === data.userMsg.content)) return prev;
              return [...prev, {
                id: data.userMsg.id,
                content: data.userMsg.content,
                role: 'user',
                createdAt: data.userMsg.createdAt || new Date().toISOString()
              }];
            });
          }
        }
      } catch (err) {
        console.error('VAT Chat: Failed to silently transcribe user live speech:', err);
      }
    },
    onStateChange: (s) => {
      console.log('GeminiLive State Change:', s);
      setOrbState(s as OrbState);
      window.dispatchEvent(new CustomEvent('voice-sync', { detail: { state: s } }));
    },
    onLevelChange: (l) => {
      window.dispatchEvent(new CustomEvent('voice-sync', { detail: { level: l } }));
    }
  });

  // Background Speech Recognition for user's side of Gemini Live
  const liveSpeechRecognitionRef = useRef<any>(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  useEffect(() => {
    // We only want the background transcription active when Gemini Live is actively connected
    if (!isLiveConnected || !roomId) {
      if (liveSpeechRecognitionRef.current) {
        try {
          liveSpeechRecognitionRef.current.stop();
        } catch {}
        liveSpeechRecognitionRef.current = null;
      }
      setLiveTranscript('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Browser does not support SpeechRecognition for live background transcription.');
      return;
    }

    console.log('VAT Chat: Starting background SpeechRecognition for Gemini Live...');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalSpeech = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSpeech += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        setLiveTranscript(interim);
      }

      if (finalSpeech.trim()) {
        const text = finalSpeech.trim();
        console.log('VAT Chat: Live Speech transcribing user:', text);
        
        // Optimistically add user message to local state
        const userMsgId = 'live-user-' + Math.random().toString(36).substring(7);
        setMessages(prev => [
          ...prev, 
          { id: userMsgId, content: text, role: 'user', createdAt: new Date() }
        ]);
        setLiveTranscript('');

        // Save to SQLite database under the active roomId without triggering another LLM reply
        fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: text,
            role: 'user',
            roomId,
            triggerLLM: false // Bypasses Ollama generation
          })
        }).catch(err => console.error('Failed to save user live transcript:', err));
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('VAT Chat: Live SpeechRecognition error:', e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are still connected to Gemini Live and not stopped manually
      if (isLiveConnected && liveSpeechRecognitionRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    liveSpeechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start Live SpeechRecognition:', err);
    }

    return () => {
      if (liveSpeechRecognitionRef.current) {
        try {
          liveSpeechRecognitionRef.current.stop();
        } catch {}
        liveSpeechRecognitionRef.current = null;
      }
    };
  }, [isLiveConnected, roomId]);

  const onSpeechStart = useCallback(() => setOrbState('listening'), []);
  const onSpeechEnd = useCallback(async (blob: Blob, text?: string) => {
    console.log('VAT: Speech ended event triggered, blob size:', blob.size, 'transcript:', text);
    if (blob.size < 1000) {
      console.warn('VAT: Blob too small, ignoring');
      setOrbState('idle');
      return;
    }
    // Only proceed with local VAT processing if Gemini Live is NOT connected
    if (!isLiveConnected) {
      setOrbState('connecting');
      setInput(''); // Clear input immediately when speech is captured
      
      // Optimistically post user's message in the chat window immediately!
      const userText = text?.trim() || 'Voice message';
      const tempId = 'temp-msg-' + Math.random().toString(36).substring(7);
      const tempUserMsg: Message = { id: tempId, content: userText, role: 'user', createdAt: new Date() };
      setMessages((prev) => [...prev, tempUserMsg]);

      await handleVoiceInput(blob, tempUserMsg);
    }
  }, [roomId, isLiveConnected]);

  // VAT Hook
  const { 
    isActive: isVATActive, 
    isSpeaking, 
    transcript,
    level,
    db,
    error: vatError,
    toggle: toggleVAT,
    startRecording,
    stopRecording
  } = useVAT({
    onSpeechStart,
    onSpeechEnd,
    disabled: orbState !== 'idle'
  });

  useEffect(() => {
    if (geminiError) {
      console.error('Gemini Error in Popup:', geminiError);
      setLiveError(geminiError);
      // Append error to chat for visibility
      setMessages(prev => [...prev, { 
        id: 'err-' + Date.now(), 
        content: `Voice Error: ${geminiError}`, 
        role: 'assistant', 
        createdAt: new Date() 
      }]);
    } else {
      setLiveError(null);
    }
  }, [geminiError]);

  const isFullDuplex = true; // Feature flag

  useEffect(() => {
    if (isFullDuplex) {
      console.log('ChatPopupV3: Full-Duplex Enabled. Key:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 5) + '...' : 'NONE');
    }
  }, [isFullDuplex]);

  const error = vatError || liveError;

  const toggleVoiceMode = () => {
    if (isFullDuplex) {
      toggleLive();
    } else {
      toggleVAT();
    }
  };

  // Update input with live transcript when speaking
  useEffect(() => {
    // Only sync transcript if we are actually in VAT mode, speaking, and in listening state
    if (isVATActive && isSpeaking && transcript && orbState === 'listening') {
      setInput(transcript);
    }
  }, [isSpeaking, transcript, isVATActive, orbState]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (isLiveConnected) {
      console.log('ChatPopupV3: User typing while Gemini Live active. Disconnecting voice.');
      toggleLive();
    }
    if (isVATActive) {
      console.log('ChatPopupV3: User typing while VAT active. Switching to typing mode and discarding audio.');
      toggleVAT(true);
    }
  };

  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Initialize position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 440, y: window.innerHeight - 640 });
    }
  }, []);

  // Sync orbState with VAT isSpeaking
  useEffect(() => {
    if (isVATActive && !isFullDuplex) {
      if (isSpeaking) {
        setOrbState('listening');
      } else if (orbState === 'listening') {
        setOrbState('connecting');
      }
    }
  }, [isSpeaking, isVATActive, isFullDuplex, orbState]);

  // Toggle open/close on event
  useEffect(() => {
    const handleToggle = () => {
      if (!isOpen) {
        setIsOpen(true);
        setIsMinimized(false);
      } else {
        setIsOpen(false);
        if (isLiveConnected) toggleLive();
      }
    };
    window.addEventListener('toggle-voice', handleToggle);
    return () => window.removeEventListener('toggle-voice', handleToggle);
  }, [isOpen, isFullDuplex, isLiveConnected, toggleLive]);

  // Drag Handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    e.preventDefault();
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  }, [isDragging]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  // Fetch initial/latest messages when popup is opened
  useEffect(() => {
    if (!isOpen) return;
    const fetchMessages = async () => {
      try {
        console.log('VAT Chat: Syncing room messages...');
        const res = await fetch('/api/chat');
        const data = await res.json();
        if (data.room?.id) {
          setMessages(data.messages || []);
          setRoomId(data.room.id);
          console.log('VAT Chat: Room synchronized:', data.room.id, 'Message count:', (data.messages || []).length);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };
    fetchMessages();
  }, [isOpen]);

  // Poll messages every 1.5s for Tailscale multi-device sync
  useEffect(() => {
    if (!isOpen || !roomId) return;

    const interval = setInterval(async () => {
      // Don't poll if we're actively talking, recording, or connecting
      if (orbState === 'listening' || orbState === 'connecting' || orbState === 'speaking') {
        return;
      }

      try {
        const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('ChatPopupV3: Polling messages failed:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, roomId, orbState]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages, isMinimized, scrollToBottom]);

  // Dynamic UI-level action parser (last line of defense)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg.role === 'assistant' && !executedMsgIdsRef.current.has(lastMsg.id)) {
      executedMsgIdsRef.current.add(lastMsg.id);
      
      const content = lastMsg.content;
      let action = null;
      
      // Look for [[ACTION: ...]] in the text
      const actionMatch = content.match(/\[\[ACTION:\s*({.*?})\]\]/);
      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1]);
        } catch {}
      }

      // Robust fallback keywords
      if (!action) {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('navigate') || lowerContent.includes('go to') || lowerContent.includes('open') || lowerContent.includes('show')) {
          if (lowerContent.includes('project')) {
            action = { type: 'NAVIGATE', path: '/projects' };
          } else if (lowerContent.includes('art') || lowerContent.includes('tracker')) {
            action = { type: 'NAVIGATE', path: '/art-tracker' };
          } else if (lowerContent.includes('task') || lowerContent.includes('todo') || lowerContent.includes('to-do')) {
            action = { type: 'NAVIGATE', path: '/tasks' };
          } else if (lowerContent.includes('calendar')) {
            action = { type: 'NAVIGATE', path: '/calendar' };
          } else if (lowerContent.includes('memory') || lowerContent.includes('palace')) {
            action = { type: 'NAVIGATE', path: '/memory' };
          } else if (lowerContent.includes('ops') || lowerContent.includes('system') || lowerContent.includes('control')) {
            action = { type: 'NAVIGATE', path: '/ops' };
          }
        }
      }

      if (action) {
        console.log('ChatPopupV3: Dynamic UI fallback parser executed action:', action);
        executeAction(action);
      }
    }
  }, [messages]);

  const handleVoiceInput = async (blob: Blob, tempUserMsg?: Message) => {
    if (!roomId) {
      console.warn('VAT: No roomId available, cannot send voice input');
      setOrbState('idle');
      return;
    }
    
    const formData = new FormData();
    formData.append('audio', blob);
    formData.append('roomId', roomId);

    try {
      console.log('VAT: Sending audio to API...');
      const res = await fetch('/api/chat/voice', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Voice API failed: ${res.status} ${errText}`);
      }
      
      const data = await res.json();
      console.log('VAT: Received API response:', data);
      
      if (data.error) {
        console.warn('VAT API returned error:', data.error);
        if (tempUserMsg) {
          // If the API errored out, remove the optimistic message
          setMessages((prev) => prev.filter(m => m.id !== tempUserMsg.id));
        }
        setOrbState('idle');
        return;
      }
      
      if (tempUserMsg) {
        // Seamlessly update the optimistic message with the high-quality server/Whisper transcript,
        // then append the assistant's reply.
        setMessages((prev) => {
          const updated = prev.map((m) => m.id === tempUserMsg.id ? { ...m, content: data.userMsg.content } : m);
          return [...updated, data.assistantMsg];
        });
      } else {
        // Fallback if no optimistic message was provided
        setMessages((prev) => [...prev, data.userMsg, data.assistantMsg]);
      }
      
      setOrbState('speaking');

      // Execute Action if present
      if (data.action) {
        executeAction(data.action);
      }
      
      // Handle audio playback
      if (data.audioBase64) {
        setLastAudio(data.audioBase64);
        console.log('VAT: Playing response audio...');
        const audio = new Audio(data.audioBase64);
        
        audio.onended = () => {
          console.log('VAT: Audio playback finished.');
          setOrbState('idle');
        };

        audio.play().catch(e => {
          console.error('Audio playback failed (browser may have blocked autoplay):', e);
          setTimeout(() => {
            setOrbState('idle');
          }, 3000);
        });
      } else {
        // No audio, just show text for a bit then restart
        setTimeout(() => {
          setOrbState('idle');
        }, 3000);
      }
    } catch (err) {
      console.error('Error handling voice input:', err);
      setOrbState('idle');
    }
  };

  const handleSend = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    // If VAT is active, always treat Send as "Finish Speaking"
    if (isVATActive) {
      console.log('ChatPopupV3: Send button clicked with VAT active. Stopping recording.');
      stopRecording();
      setInput(''); // Clear input immediately
      return;
    }

    const hasText = input.trim().length > 0;
    if (!hasText || !roomId) return;

    const content = input;
    setInput('');
    setOrbState('connecting');

    const tempId = Math.random().toString(36).substring(7);
    const userMsg: Message = { id: tempId, content, role: 'user', createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, role: 'user', roomId }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      setOrbState('idle');

      if (data.assistantMsg) {
        setMessages((prev) => [...prev, data.assistantMsg]);
        setOrbState('speaking');
        
        // Execute Action if present
        if (data.action) {
          executeAction(data.action);
        }

        setTimeout(() => setOrbState('idle'), 2000);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setOrbState('idle');
    }
  };

  const executeAction = (action: any) => {
    if (!action || !action.type) return;
    console.log('ChatPopupV3: Executing action:', action);
    
    switch (action.type) {
      case 'NAVIGATE':
        if (action.path) {
          router.push(action.path);
        }
        break;
      case 'CHECK_STUDIO':
        fetch('/api/studio/environment')
          .then(res => res.json())
          .then(data => {
            if (data.environment && data.environment.length > 0) {
              const env = data.environment[0];
              const summary = `Studio is at ${env.temperature}°C with ${env.humidity}% humidity.`;
              window.dispatchEvent(new CustomEvent('studio-status-update', { detail: summary }));
              console.log('ChatPopupV3: Studio status:', summary);
            }
          })
          .catch(err => console.error('Failed to check studio:', err));
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMainOrbClick = () => {
    if (isFullDuplex) {
      toggleLive();
    } else {
      if (orbState === 'listening') stopRecording();
      else playLastAudio();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      style={{ 
        left: isMinimized ? 'auto' : position.x, 
        top: isMinimized ? 'auto' : position.y,
        right: isMinimized ? '2rem' : 'auto',
        bottom: isMinimized ? '2rem' : 'auto',
        position: 'fixed'
      }}
      className={`z-[100] ${isDragging ? '' : 'transition-all duration-300 ease-out'} ${
        isMinimized 
          ? 'w-20 h-20 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl border border-white/10' 
          : 'w-[400px] h-[600px] rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.6)] flex flex-col bg-[#1e2124]/60 backdrop-blur-2xl border border-[#a29bfe]/20'
      }`}
    >
      {/* Header / Drag Handle */}
      <header 
        onMouseDown={onMouseDown}
        className={`flex items-center justify-between px-6 py-4 cursor-grab active:cursor-grabbing select-none ${isMinimized ? 'h-full justify-center p-0' : 'bg-white/10 rounded-t-[40px]'}`}
      >
        {isMinimized ? (
          <button onClick={() => setIsMinimized(false)} className="w-full h-full flex items-center justify-center">
            <VoiceOrb state={orbState} audioLevel={level} size={40} />
          </button>
        ) : (
          <>
            <div className="flex items-center space-x-3">
              <GripHorizontal size={14} className="text-[#636e72]" />
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1e2124] shadow-[inset_2px_2px_5px_#121416,inset_-2px_-2px_5px_#2a2e33]">
                <Bot size={16} className="text-[#a29bfe]" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#ffffff]">VAT Chat V3</h1>
                <p className="text-[9px] font-medium text-[#b2bec3] flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isLiveConnected || isVATActive ? (orbState === 'listening' || isSpeaking ? 'bg-green-400 animate-ping' : 'bg-green-400') : 'bg-gray-500'}`}></span>
                  {isLiveConnected ? 'Live Duplex' : (isVATActive ? 'VAT Active' : 'Voice Off')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button onClick={() => setIsMinimized(true)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Minimize2 size={14} className="text-[#b2bec3]" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl hover:bg-red-500/20 group transition-colors">
                <X size={14} className="text-[#b2bec3] group-hover:text-red-400" />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Content */}
      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale">
                <Bot size={48} className="mb-4" />
                <p className="text-xs font-medium uppercase tracking-widest">Awaiting Input</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex items-end space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-[#1e2124] shadow-lg shrink-0">
                    {msg.role === 'user' ? <User size={10} /> : <Bot size={10} className="text-[#a29bfe]" />}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-[13px] leading-relaxed shadow-xl border border-white/5 ${msg.role === 'user' ? 'bg-[#2d3436]/80 text-white rounded-br-none border-zinc-700/50' : 'bg-[#1e2124]/80 text-zinc-200 rounded-bl-none border-l-[#a29bfe] border-l-2'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLiveConnected && liveTranscript && (
              <div className="flex justify-end animate-pulse">
                <div className="max-w-[85%] flex items-end space-x-2 flex-row-reverse space-x-reverse">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-[#1e2124] shadow-lg shrink-0">
                    <User size={10} />
                  </div>
                  <div className="px-4 py-2 rounded-2xl text-[13px] leading-relaxed shadow-xl border border-white/5 bg-[#2d3436]/30 text-zinc-400 rounded-br-none italic">
                    {liveTranscript}...
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 pt-2 flex-shrink-0 border-t border-white/5 bg-[#1e2124]/40 rounded-b-[40px]">
            <form onSubmit={handleSend} className="flex items-end space-x-3 px-4 py-2 rounded-2xl bg-[#1e2124] shadow-[inset_4px_4px_8px_#121416,inset_-4px_-4px_8px_#2a2e33] border border-white/5">
              <button 
                type="button" 
                onClick={toggleVoiceMode}
                className={`p-2 mb-0.5 rounded-xl transition-all ${isLiveConnected || isVATActive ? 'bg-[#ff7675] text-white shadow-lg' : 'text-[#b2bec3] hover:text-[#a29bfe]'}`}
                title={isLiveConnected ? "Disconnect Voice" : "Enable Full-Duplex Voice"}
              >
                {isLiveConnected || isVATActive ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <textarea 
                ref={textareaRef}
                rows={1}
                value={input} 
                onFocus={() => {
                  if (isVATActive) {
                    console.log('ChatPopupV3: Input focused while VAT active. Switching to typing mode and discarding audio.');
                    toggleVAT(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={isLiveConnected ? "Full-Duplex Active: Speak to Muffin" : (isVATActive ? (isSpeaking ? "Muffin is listening..." : "Starting mic...") : "Type a message...")} 
                className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-[#636e72] text-[#ffffff] resize-none py-2 max-h-[120px] custom-scrollbar"
              />
              <button 
                type="submit" 
                className="p-2 mb-0.5 rounded-xl text-[#a29bfe] hover:scale-110 transition-transform flex-shrink-0"
              >
                <Send size={18} />
              </button>
            </form>
            <div className="flex flex-col items-center justify-center mt-4 flex-shrink-0">
               {error ? (
                 <div className="text-[10px] text-red-400 font-bold mb-2 animate-bounce max-w-[200px] text-center">
                   {error}
                 </div>
               ) : !isVATActive && (
                 <div className="text-[9px] text-[#636e72] font-medium mb-2 uppercase tracking-tighter">
                   Click Mic to Start
                 </div>
               )}
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a29bfe] mb-2 h-4 text-center">
                  {orbState === 'idle' ? (isVATActive ? <span>Waiting... ({Math.round(db)}dB)</span> : 'Voice Standby') :
                   orbState === 'listening' ? <span className="text-green-400 animate-pulse">Listening...</span> :
                   orbState === 'connecting' ? <span className="text-blue-400 animate-pulse">Processing...</span> :
                   <span className="text-purple-400 animate-pulse">Speaking...</span>}
               </div>
               <button 
                 type="button" 
                 onClick={handleMainOrbClick} 
                 disabled={!isFullDuplex && orbState !== 'listening' && !lastAudio} 
                 className={`hover:scale-110 transition-transform p-2 ${orbState === 'listening' ? 'animate-pulse text-green-400' : 'disabled:opacity-30'}`}
               >
                  <VoiceOrb state={orbState} audioLevel={level} size={50} />
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
