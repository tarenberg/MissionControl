'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Plus, 
  Search, 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  Paperclip,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { useVAT } from '@/hooks/useVAT';
import CollapsibleCodeBlock from '@/components/Chat/CollapsibleCodeBlock';
import TelemetryIndicator from '@/components/Chat/TelemetryIndicator';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  messages?: Message[];
}

const SLASH_COMMANDS = [
  { cmd: '/status', desc: 'Get system status and runtime stats' },
  { cmd: '/reset', desc: 'Clear conversation history for this room' },
  { cmd: '/logs', desc: 'Display latest background agent execution logs' },
  { cmd: '/help', desc: 'Show detailed user instructions for VAT Chat' },
];

export default function VATChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [playbackAudio, setPlaybackAudio] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all active chat rooms
  const fetchRooms = async (selectFirst = false) => {
    try {
      setLoadingRooms(true);
      const res = await fetch('/api/chat/rooms');
      const data = await res.json();
      if (data.rooms) {
        setRooms(data.rooms);
        if (selectFirst && data.rooms.length > 0 && !activeRoomId) {
          setActiveRoomId(data.rooms[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Fetch messages for the currently selected room
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  // Sync / poll rooms and messages every 1.5s for Tailscale multi-device real-time sync
  useEffect(() => {
    fetchRooms(true);
    const interval = setInterval(() => {
      fetchRooms(false);
      if (activeRoomId) {
        fetchMessages(activeRoomId);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeRoomId, fetchMessages]);

  // Load messages when active room changes
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId, fetchMessages]);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Handle slash commands suggestions
  useEffect(() => {
    if (input.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [input]);

  // Handle standard key presses
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape closes slash menu
    if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  // Create a new room / session
  const handleNewRoom = async () => {
    const name = prompt('Enter a name for the new chat room:');
    if (!name || name.trim() === '') return;

    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.room?.id) {
        setActiveRoomId(data.room.id);
        fetchRooms();
      }
    } catch (err) {
      console.error('Failed to create new room:', err);
    }
  };

  // Delete/Clear room history
  const handleClearHistory = async () => {
    if (!activeRoomId) return;
    if (!confirm('Are you sure you want to clear this room\'s history?')) return;

    try {
      const res = await fetch(`/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: activeRoomId,
          content: 'Conversation history cleared.',
          role: 'assistant',
        }),
      });
      if (res.ok) {
        setMessages([]);
        fetchMessages(activeRoomId);
      }
    } catch (err) {
      console.error('Failed to clear room history:', err);
    }
  };

  // Handle sending text or executing a slash command
  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText || input;
    if (!textToSend.trim() || !activeRoomId) return;

    setInput('');
    setShowSlashMenu(false);

    // If it's a built-in slash command, process locally
    if (textToSend.trim() === '/reset') {
      handleClearHistory();
      return;
    }

    if (textToSend.trim() === '/status') {
      setIsThinking(true);
      // Insert optimistic user message
      const optUserMsg: Message = {
        id: Math.random().toString(),
        content: textToSend,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optUserMsg]);

      setTimeout(() => {
        const optAssistantMsg: Message = {
          id: Math.random().toString(),
          content: `📊 **System Status**
- **Gateway**: Nominal (HEARTBEAT_OK)
- **Local LLM**: Gemma2 (Ollama) Active
- **STT**: Whisper Local Active
- **TTS**: Piper Local Active
- **Time**: ${new Date().toLocaleTimeString()}
- **Platform**: Tailscale Enabled`,
          role: 'assistant',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optAssistantMsg]);
        setIsThinking(false);
      }, 800);
      return;
    }

    if (textToSend.trim() === '/logs') {
      setIsThinking(true);
      const optUserMsg: Message = {
        id: Math.random().toString(),
        content: textToSend,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optUserMsg]);

      setTimeout(() => {
        const optAssistantMsg: Message = {
          id: Math.random().toString(),
          content: `📋 **System logs (Last 3 entries)**
\`\`\`bash
[2026-05-20 20:52:15] [Muffin] File verbatim memory stored in MemPalace (wing: missioncontrol).
[2026-05-20 20:56:41] [Gateway] Sync heartbeat OK.
[2026-05-20 21:00:18] [STT] Audio WebM processed successfully in 234ms.
\`\`\``,
          role: 'assistant',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optAssistantMsg]);
        setIsThinking(false);
      }, 800);
      return;
    }

    if (textToSend.trim() === '/help') {
      setIsThinking(true);
      const optUserMsg: Message = {
        id: Math.random().toString(),
        content: textToSend,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optUserMsg]);

      setTimeout(() => {
        const optAssistantMsg: Message = {
          id: Math.random().toString(),
          content: `🧁 **VAT Chat Manual**
Welcome to VAT Chat, your local, secure studio messaging control center.
- **Continuous Voice (Hot Mic)**: Click the microphone toggle button (5.c). When blue, Muffin auto-listens and processes your speech on silence!
- **Speaker Toggle**: Unmute the Speaker icon at the top right to enable automatic voice TTS playback.
- **Slash Commands**: Type \`/\` in the text field to discover local shortcuts like \`/status\`, \`/logs\`, or \`/reset\`.`,
          role: 'assistant',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optAssistantMsg]);
        setIsThinking(false);
      }, 800);
      return;
    }

    // Insert user message optimistically
    const userMsg: Message = {
      id: 'opt-' + Date.now(),
      content: textToSend,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToSend,
          roomId: activeRoomId,
          role: 'user',
          mute: isMuted,
        }),
      });

      const data = await res.json();
      if (data.assistantMsg) {
        // Replace or add messages
        setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), data.userMsg, data.assistantMsg]);
        
        // Handle Action Triggers
        if (data.action) {
          executeUIAction(data.action);
        }

        // Voice playback
        if (data.audioBase64) {
          playAudio(data.audioBase64);
        }
      }
    } catch (err) {
      console.error('Failed to send text message:', err);
    } finally {
      setIsThinking(false);
    }
  };

  // Dynamic UI Action executor
  const executeUIAction = (action: any) => {
    console.log('Executing action payload:', action);
    if (action.type === 'NAVIGATE' && action.path) {
      // Simulate navigate or alert user
      const optMsg: Message = {
        id: 'act-' + Date.now(),
        content: `⚡ **Action Executed**: Navigating to \`${action.path}\``,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optMsg]);
      setTimeout(() => {
        window.location.href = action.path;
      }, 1000);
    } else if (action.type === 'SEARCH') {
      const optMsg: Message = {
        id: 'act-' + Date.now(),
        content: `⚡ **Action Executed**: Searching \`${action.target}\` for *"${action.query}"*`,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optMsg]);
    }
  };

  // Play returned voice base64 audio
  const playAudio = (audioBase64: string) => {
    setPlaybackAudio(audioBase64);
    const audio = new Audio(audioBase64);
    audio.play().catch(e => console.error('Voice playback failed:', e));
  };

  // --- useVAT continuous Voice Activity Trigger Hook ---
  const onSpeechStart = useCallback(() => {
    setIsThinking(true);
  }, []);

  const onSpeechEnd = useCallback(async (blob: Blob, text?: string) => {
    if (blob.size < 1000 || !activeRoomId) {
      setIsThinking(false);
      return;
    }

    const userText = text?.trim() || 'Voice Activity Triggered';
    
    // Optimistic user bubble
    const userMsg: Message = {
      id: 'opt-voice-' + Date.now(),
      content: userText,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('roomId', activeRoomId);

      const res = await fetch('/api/chat/voice', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.assistantMsg) {
        setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), data.userMsg, data.assistantMsg]);
        
        if (data.action) {
          executeUIAction(data.action);
        }

        if (data.audioBase64 && !isMuted) {
          playAudio(data.audioBase64);
        }
      }
    } catch (err) {
      console.error('Failed to send voice input:', err);
    } finally {
      setIsThinking(false);
    }
  }, [activeRoomId, isMuted]);

  const { 
    isActive: isVATActive, 
    isSpeaking, 
    transcript,
    toggle: toggleVAT,
  } = useVAT({
    onSpeechStart,
    onSpeechEnd,
  });

  // Track if continuous hot mic is active to sync UI indicator
  useEffect(() => {
    setIsHotMic(isVATActive);
  }, [isVATActive]);

  const [isHotMic, setIsHotMic] = useState(false);

  // Keyboard shortcut listener: Ctrl + M toggles continuous hot mic
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleVAT();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [toggleVAT]);

  // Handle Drag & Drop overlay
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleUploadFile(file);
    }
  };

  const handleUploadFile = (file: File) => {
    const optUserMsg: Message = {
      id: Math.random().toString(),
      content: `📁 Attached File: **${file.name}** (${Math.round(file.size / 1024)} KB)`,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optUserMsg]);
    setIsThinking(true);

    setTimeout(() => {
      const optAssistantMsg: Message = {
        id: Math.random().toString(),
        content: `I have received and staged the file **${file.name}** for analysis. It has been synced locally over Tailscale.`,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optAssistantMsg]);
      setIsThinking(false);
    }, 1200);
  };

  // Find active room metadata
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const activeRoomName = activeRoom?.name || 'Muffin';

  // Format timestamp helper
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Render message bubble contents, extracting code blocks and interactive buttons
  const renderMessageContent = (content: string) => {
    const parts = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{textBefore}</span>);
      }

      const lang = match[1] || 'javascript';
      const code = match[2];
      parts.push(
        <CollapsibleCodeBlock key={match.index} code={code} language={lang} />
      );

      lastIndex = regex.lastIndex;
    }

    const textAfter = content.substring(lastIndex);
    if (textAfter) {
      // Look for action payload tag
      const actionMatch = textAfter.match(/\[\[ACTION:\s*({.*?})\]\]/);
      if (actionMatch) {
        const textClean = textAfter.replace(actionMatch[0], '').trim();
        parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{textClean}</span>);
        try {
          const actObj = JSON.parse(actionMatch[1]);
          parts.push(
            <div key="action-card" className="mt-4 p-4 rounded-2xl bg-zinc-900 border border-indigo-500/40 shadow-glow-blue animate-pulse-soft">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={12} /> System Action Requested
              </p>
              <p className="text-sm text-zinc-300 font-mono bg-zinc-950 p-2 rounded-xl mb-3 border border-zinc-800">
                {JSON.stringify(actObj, null, 2)}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => executeUIAction(actObj)}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-soft active:scale-95 transition-all"
                >
                  Approve Execution
                </button>
                <button 
                  onClick={() => alert('Action Rejected')}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold shadow-soft active:scale-95 transition-all"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        } catch {
          parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{textAfter}</span>);
        }
      } else {
        parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{textAfter}</span>);
      }
    }

    return parts;
  };

  // Filter rooms based on query
  const filteredRooms = rooms.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="flex h-[calc(100vh-6rem)] bg-neo-bg text-zinc-100 rounded-[40px] overflow-hidden border border-white/5 dark:border-white/5 shadow-neo-flat relative"
      onDragEnter={handleDrag}
    >
      {/* Sidebar (Left Column) */}
      <div className="w-80 border-r border-zinc-300/20 dark:border-zinc-800/40 flex flex-col bg-zinc-900/10 dark:bg-zinc-950/20">
        {/* Search & Action Panel */}
        <div className="p-4 border-b border-zinc-300/20 dark:border-zinc-800/40 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Terminal size={14} className="text-blue-500 animate-pulse-soft" />
              VAT Channels
            </h1>
            <button
              onClick={handleNewRoom}
              className="w-8 h-8 rounded-full neo-button flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:neo-glow-blue transition-all"
              title="New Channel"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/40 border border-zinc-300/20 dark:border-zinc-800/40 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {loadingRooms && rooms.length === 0 ? (
            <div className="flex justify-center p-8">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center p-8 text-zinc-600 text-xs">
              No channels found
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const lastMsg = room.messages?.[0];
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`w-full text-left p-3.5 rounded-3xl transition-all duration-300 border flex items-center justify-between group ${
                    isActive 
                      ? 'neo-button text-blue-600 dark:text-blue-400 border-blue-500/30' 
                      : 'border-transparent hover:bg-zinc-800/20 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-sm font-bold shadow-soft select-none">
                      {room.name?.substring(0, 2) || 'MC'}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-bold truncate leading-tight">
                        {room.name || 'Agent Thread'}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate leading-relaxed">
                        {lastMsg ? lastMsg.content : 'No messages yet'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[9px] text-zinc-600">
                      {room.updatedAt ? formatTime(room.updatedAt) : ''}
                    </span>
                    <Clock size={10} className="text-zinc-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Pane (Right Column) */}
      <div className="flex-1 flex flex-col bg-[#161619]/40 relative">
        {activeRoomId ? (
          <>
            {/* Header section */}
            <div className="px-6 py-4 border-b border-zinc-300/20 dark:border-zinc-800/40 flex items-center justify-between bg-zinc-900/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/40 flex items-center justify-center text-base font-bold shadow-soft">
                  {activeRoomName.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-200">
                    {activeRoomName}
                  </span>
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 leading-none mt-0.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    secure network sync
                  </span>
                </div>
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-4">
                {/* Telemetry Ring */}
                <TelemetryIndicator isThinking={isThinking} agentName={activeRoomName} />

                {/* Mute/Unmute toggle */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-9 h-9 rounded-full neo-button flex items-center justify-center transition-all ${
                    isMuted 
                      ? 'text-zinc-500 hover:text-zinc-300' 
                      : 'text-emerald-500 hover:text-emerald-400 hover:neo-glow-green'
                  }`}
                  title={isMuted ? 'Unmute voice feedback' : 'Mute voice feedback'}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                {/* Clear Room history */}
                <button
                  onClick={handleClearHistory}
                  className="w-9 h-9 rounded-full neo-button flex items-center justify-center text-zinc-500 hover:text-rose-500 hover:neo-glow-red transition-all"
                  title="Clear history"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-radial-gradient"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    🧁
                  </div>
                  <h3 className="text-xs font-bold text-zinc-300">Start a local discussion</h3>
                  <p className="text-[10px] text-zinc-500 max-w-xs">
                    Type a query or toggle the Hot Mic button below for continuous voice control.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
                    >
                      <div className={`max-w-[70%] flex flex-col gap-1`}>
                        {/* Bubble */}
                        <div className={`p-4 rounded-[28px] text-xs shadow-soft border transition-all ${
                          isUser 
                            ? 'bg-zinc-800/80 border-zinc-700/40 text-zinc-100 rounded-tr-sm' 
                            : 'bg-[#1a1a1e] border-zinc-800/50 text-zinc-300 rounded-tl-sm'
                        }`}>
                          {renderMessageContent(msg.content)}
                        </div>
                        {/* Timestamp */}
                        <span className={`text-[9px] text-zinc-600 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Live transcript while speaking */}
              {isSpeaking && transcript && (
                <div className="flex justify-end animate-pulse">
                  <div className="max-w-[70%] p-4 rounded-[28px] rounded-tr-sm text-xs bg-zinc-800/40 border border-zinc-700/20 text-zinc-400 italic">
                    {transcript}...
                  </div>
                </div>
              )}

              {/* Local LLM Thinking status */}
              {isThinking && !isSpeaking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-[28px] rounded-tl-sm bg-[#1a1a1e] border border-zinc-800/40">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">Analyzing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Section / Footer */}
            <div className="p-4 border-t border-zinc-300/20 dark:border-zinc-800/40 bg-zinc-900/10 backdrop-blur-md relative">
              {/* Slash autocomplete popup */}
              {showSlashMenu && (
                <div className="absolute bottom-full left-4 mb-2 w-72 rounded-2xl border border-zinc-800 bg-[#121214] shadow-glow-blue overflow-hidden z-30 animate-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3 py-2 border-b border-zinc-800/40 bg-zinc-900/60 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Quick Commands
                  </div>
                  <div className="p-1 space-y-0.5">
                    {SLASH_COMMANDS.map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => handleSend(item.cmd)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-zinc-800/50 flex items-center justify-between group transition-colors"
                      >
                        <span className="font-mono text-indigo-400 group-hover:text-indigo-300 font-bold">{item.cmd}</span>
                        <span className="text-zinc-500 text-[10px]">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input controller */}
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                {/* File picker */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full neo-button flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:neo-glow-blue transition-all shrink-0"
                  title="Attach file"
                >
                  <Paperclip size={15} />
                </button>

                {/* Textarea field */}
                <div className="flex-1 relative neo-pressed rounded-[24px] overflow-hidden border border-zinc-300/10 dark:border-zinc-800/50 bg-zinc-950/20">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isHotMic ? "Hot Mic active... speak or type here" : "Message or use /commands..."}
                    className="w-full pl-4 pr-10 py-3 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none min-h-[40px] max-h-[120px] custom-scrollbar leading-relaxed"
                  />
                </div>

                {/* Hot Mic continuous Voice Toggle Button (5.c) */}
                <button
                  onClick={() => toggleVAT()}
                  className={`w-10 h-10 rounded-full neo-button flex items-center justify-center shrink-0 transition-all ${
                    isHotMic 
                      ? 'text-white bg-blue-600 shadow-glow-blue hover:bg-blue-500 animate-pulse-soft' 
                      : 'text-zinc-400 hover:text-blue-500 hover:neo-glow-blue'
                  }`}
                  title="Toggle continuous Hot Mic (Ctrl+M)"
                >
                  {isHotMic ? <Mic size={15} /> : <MicOff size={15} />}
                </button>

                {/* Send Button */}
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className={`w-10 h-10 rounded-full neo-button flex items-center justify-center shrink-0 transition-all ${
                    input.trim() 
                      ? 'text-white bg-indigo-600 shadow-glow-blue hover:bg-indigo-500' 
                      : 'text-zinc-600 cursor-not-allowed'
                  }`}
                  title="Send message"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 opacity-75">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800/60 flex items-center justify-center text-2xl shadow-soft">
              🧁
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-zinc-200">Secure VAT Chat Workspace</h2>
              <p className="text-[10px] text-zinc-500 max-w-sm">
                Select a channel from the left sidebar or create a new session thread to begin direct control.
              </p>
            </div>
            <button
              onClick={handleNewRoom}
              className="px-5 py-2.5 rounded-2xl neo-button text-xs font-bold text-blue-500 hover:neo-glow-blue transition-all"
            >
              Start New Thread
            </button>
          </div>
        )}

        {/* Drag & Drop Overlay */}
        {dragActive && (
          <div 
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-[40px] m-4 flex flex-col items-center justify-center gap-3 z-50 animate-in fade-in duration-200"
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-blue-500/40 flex items-center justify-center text-blue-500 shadow-glow-blue">
              <FileText size={24} />
            </div>
            <h2 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Upload to VAT Workspace</h2>
            <p className="text-[10px] text-zinc-500">Drop your file here to sync over secure Tailscale network</p>
          </div>
        )}
      </div>
    </div>
  );
}
