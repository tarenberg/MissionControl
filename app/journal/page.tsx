"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Trash2, 
  Mic, 
  MicOff, 
  MapPin, 
  CloudSun, 
  Search, 
  X, 
  Calendar, 
  Edit3, 
  Loader2,
  FileText
} from 'lucide-react';

interface JournalMedia {
  id: string;
  url: string;
  type: string;
  filename: string;
}

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  location: string | null;
  weather: string | null;
  createdAt: string;
  media: JournalMedia[];
}

const MOODS = [
  { code: 'happy', emoji: '☀️', label: 'Happy' },
  { code: 'reflective', emoji: '🌌', label: 'Reflective' },
  { code: 'tired', emoji: '🔋', label: 'Tired' },
  { code: 'focused', emoji: '🎯', label: 'Focused' },
  { code: 'inspired', emoji: '🎨', label: 'Inspired' },
];

function formatTranscript(text: string): string {
  if (!text) return '';
  
  // Trim whitespace
  let formatted = text.trim();

  // 1. Capitalize first letter of the overall text and any letter following a punctuation sentence-ender (. ! ?)
  formatted = formatted.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });

  // 2. Capitalize lone "i", "i'm", "i'll", "i'd", "i've"
  formatted = formatted.replace(/\bi\b/g, 'I');
  formatted = formatted.replace(/\bi'm\b/gi, "I'm");
  formatted = formatted.replace(/\bi'll\b/gi, "I'll");
  formatted = formatted.replace(/\bi've\b/gi, "I've");
  formatted = formatted.replace(/\bi'd\b/gi, "I'd");
  
  // 3. Automate punctuation: If the transcript segment doesn't already end with a punctuation mark, append a period.
  if (formatted && !/[.!?]$/.test(formatted)) {
    formatted += '.';
  }

  return formatted;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState('All');

  // New Entry Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [location, setLocation] = useState('New Haven, CT');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);

  // Voice Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const [speechMode, setSpeechMode] = useState<'tap' | 'continuous'>('tap');
  const recognitionRef = useRef<any>(null);
  const speechModeRef = useRef<'tap' | 'continuous'>('tap');
  const isDictatingRef = useRef(false);

  // Keep refs synced to bypass stale closures
  useEffect(() => {
    speechModeRef.current = speechMode;
  }, [speechMode]);

  useEffect(() => {
    isDictatingRef.current = isDictating;
  }, [isDictating]);

  // Lightbox Modal State
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);

  // Editing Entry State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState('');

  useEffect(() => {
    fetchEntries();
    setupDictation();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/journal?search=${encodeURIComponent(searchTerm)}&mood=${selectedMoodFilter}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
      }
    } catch (err) {
      console.error('Error loading journal entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when search or filter change
  useEffect(() => {
    fetchEntries();
  }, [searchTerm, selectedMoodFilter]);

  const setupDictation = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (e: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              finalTranscript += e.results[i][0].transcript;
            } else {
              interimTranscript += e.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            const formattedSegment = formatTranscript(finalTranscript);
            setContent(prev => {
              const trimmedPrev = prev.trim();
              if (!trimmedPrev) return formattedSegment;
              
              // Determine if we need a period and space or just a space
              const endsWithPunctuation = /[.!?]$/.test(trimmedPrev);
              const connector = endsWithPunctuation ? ' ' : '. ';
              return trimmedPrev + connector + formattedSegment;
            });
          }
        };

        rec.onend = () => {
          // If in continuous Hot Mic mode, auto-restart the mic session on timeout/silence
          if (isDictatingRef.current && speechModeRef.current === 'continuous') {
            console.log('[Continuous Hot Mic] Speech ended. Auto-restarting loop...');
            try {
              rec.start();
            } catch (err) {
              console.error('Error restarting continuous mic:', err);
              setIsDictating(false);
            }
          } else {
            setIsDictating(false);
          }
        };

        rec.onerror = (e: any) => {
          console.error('Speech Recognition Error:', e);
          if (e.error === 'no-speech' && speechModeRef.current === 'continuous' && isDictatingRef.current) {
            // Let the onend handler manage the restart silently
            return;
          }
          setIsDictating(false);
        };

        recognitionRef.current = rec;
      }
    }
  };

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert('Speech-to-text dictation is not supported in this browser.');
      return;
    }

    if (isDictating) {
      setIsDictating(false);
      recognitionRef.current.stop();
    } else {
      setIsDictating(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);

      // Create object URLs for local previews
      const newPreviews = filesArray.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      }));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    // Revoke the object URL to release memory
    URL.revokeObjectURL(previews[index].url);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      let uploadedMedia: { url: string; type: string; filename: string }[] = [];

      // 1. Upload files first if there are any
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });

        const uploadRes = await fetch('/api/journal/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedMedia = uploadData.media;
        } else {
          throw new Error(uploadData.error || 'Failed to upload media');
        }
      }

      // 2. Submit entry
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          mood: selectedMood,
          location: location.trim(),
          media: uploadedMedia,
        })
      });

      const entryData = await response.json();
      if (entryData.success) {
        // Reset form
        setTitle('');
        setContent('');
        setSelectedMood(null);
        setSelectedFiles([]);
        setPreviews([]);
        fetchEntries();
      } else {
        alert(entryData.error || 'Failed to create entry.');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err.message || 'Error saving journal entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this memory? This will also remove any associated media files on disk.')) return;

    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchEntries();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setEditTitle(entry.title || '');
    setEditContent(entry.content);
    setEditMood(entry.mood);
    setEditLocation(entry.location || 'New Haven, CT');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          mood: editMood,
          location: editLocation.trim()
        }),
      });

      if (res.ok) {
        setEditingEntryId(null);
        fetchEntries();
      }
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  return (
    <div className="p-4 md:p-12 flex flex-col h-full bg-neo-bg min-h-screen transition-colors duration-300">
      
      {/* Header Block with mobile-responsive margins to float clear of the sidebar/hamburger menu */}
      <div className="mb-8 md:mb-12 ml-12 md:ml-16 lg:ml-4">
        <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-4xl md:text-5xl mb-3 drop-shadow-sm uppercase">Personal Journal</h1>
        <div className="flex items-center gap-3">
          <div className="neo-pressed px-6 py-2 rounded-full">
            <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] m-0">Your Private Vault & Memories</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 flex-1 items-stretch">
        
        {/* LEFT COLUMN: Entry Editor (4 cols on wide screens) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="neo-flat rounded-3xl p-6 md:p-8 flex flex-col gap-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <FileText className="text-blue-500" size={20} />
              Capture Your Moment
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Optional Title Input */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Title (Optional)</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Today's highlights..." 
                  className="neo-pressed rounded-2xl py-3 px-4 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none transition-all w-full"
                />
              </div>

              {/* Text Area (Entry Body) */}
              <div className="flex flex-col gap-2 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">What's on your mind?</label>
                  <div className="flex items-center gap-2">
                    {/* Segmented Mode Selector */}
                    <div className="neo-pressed p-0.5 rounded-full flex gap-1 bg-zinc-200/50 dark:bg-zinc-800/30">
                      <button
                        type="button"
                        onClick={() => {
                          setSpeechMode('tap');
                          if (isDictating) {
                            setIsDictating(false);
                            recognitionRef.current?.stop();
                          }
                        }}
                        className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border-none cursor-pointer transition-all ${
                          speechMode === 'tap'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                        title="Manual Tap: Click mic, speak sentence, click off"
                      >
                        Tap Speak
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSpeechMode('continuous');
                          if (isDictating) {
                            setIsDictating(false);
                            recognitionRef.current?.stop();
                          }
                        }}
                        className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border-none cursor-pointer transition-all ${
                          speechMode === 'continuous'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                        title="Hot Mic: Continuous listening with auto-reconnect"
                      >
                        Hot Mic
                      </button>
                    </div>

                    {/* Mic Button */}
                    <button
                      type="button"
                      onClick={toggleDictation}
                      className={`p-2 rounded-full border-none cursor-pointer transition-all ${
                        isDictating 
                          ? speechMode === 'continuous'
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-blue-600 text-white animate-pulse'
                          : 'neo-button text-blue-500 hover:text-blue-600'
                      }`}
                      title={isDictating ? 'Stop listening' : `Start listening (${speechMode === 'continuous' ? 'Continuous Hot Mic' : 'Tap Speak'})`}
                    >
                      {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Speak or type your memories here..."
                  rows={6}
                  className="neo-pressed rounded-2xl py-4 px-4 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none transition-all w-full resize-none leading-relaxed"
                />
                {isDictating && (
                  <p className="text-[11px] text-red-500 font-bold m-0 italic animate-pulse absolute bottom-3 left-4">
                    {speechMode === 'continuous' ? '🎤 Continuous Hot Mic active... speak freely' : '🎤 Listening on-demand...'}
                  </p>
                )}
              </div>

              {/* Mood Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Vibe Check</label>
                <div className="flex flex-wrap gap-2.5">
                  {MOODS.map(m => {
                    const isSelected = selectedMood === m.code;
                    return (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => setSelectedMood(isSelected ? null : m.code)}
                        className={`px-4 py-2 rounded-xl border-none cursor-pointer text-xs font-bold transition-all ${
                          isSelected 
                            ? 'neo-pressed text-blue-500 shadow-inner' 
                            : 'neo-button text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <span className="mr-1.5">{m.emoji}</span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Metadata Inputs (Location) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-1">
                    <MapPin size={12} />
                    Location
                  </label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="New Haven, CT" 
                    className="neo-pressed rounded-xl py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none transition-all w-full"
                  />
                </div>
              </div>

              {/* Photo & Video Local Upload Area */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-1">
                  <Camera size={12} />
                  Photos & Videos
                </label>
                <div className="neo-pressed rounded-2xl p-4 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 cursor-pointer relative min-h-[100px] transition-all">
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    multiple 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Camera size={28} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tap to snap or select files</span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-widest">Images & MP4/MOV</span>
                </div>

                {/* Upload Previews */}
                {previews.length > 0 && (
                  <div className="flex gap-3 flex-wrap mt-2 p-3 neo-pressed rounded-2xl overflow-x-auto">
                    {previews.map((prev, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 group border border-zinc-200 dark:border-zinc-800">
                        {prev.type === 'video' ? (
                          <video src={prev.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={prev.url} className="w-full h-full object-cover" alt="preview" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full border-none cursor-pointer shadow-md transition-all"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isSubmitting || !content.trim()}
                className={`neo-button w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-none active:neo-button-active ${
                  !content.trim() 
                    ? 'text-gray-400 cursor-not-allowed opacity-50' 
                    : 'text-blue-500 hover:text-blue-600 font-bold'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Uploading & Saving...
                  </>
                ) : 'Save Journal Entry 🏆'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Chronological Timeline Stream (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Filter Bar */}
          <div className="neo-flat rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search keywords..."
                className="neo-pressed rounded-2xl py-3.5 pl-10 pr-4 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none transition-all w-full"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => setSelectedMoodFilter('All')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${
                  selectedMoodFilter === 'All' 
                    ? 'neo-pressed text-blue-500' 
                    : 'neo-button text-gray-600 dark:text-gray-300'
                }`}
              >
                All Vibe
              </button>
              {MOODS.map(m => (
                <button
                  key={m.code}
                  onClick={() => setSelectedMoodFilter(m.code)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${
                    selectedMoodFilter === m.code 
                      ? 'neo-pressed text-blue-500' 
                      : 'neo-button text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="mr-1">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Feed Container */}
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto max-h-[85vh] pr-2">
            {isLoading ? (
              <div className="neo-flat rounded-3xl p-12 flex flex-col items-center justify-center text-gray-400">
                <Loader2 size={32} className="animate-spin mb-2" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Retrieving Timeline...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="neo-flat rounded-3xl p-12 text-center text-gray-400">
                <p className="font-bold text-sm">Your diary is empty.</p>
                <p className="text-xs text-gray-500 mt-1">Capture your first life memory on the left card!</p>
              </div>
            ) : (
              entries.map(entry => {
                const isEditing = editingEntryId === entry.id;
                const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                const formattedTime = new Date(entry.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const moodObj = MOODS.find(m => m.code === entry.mood);

                return (
                  <div key={entry.id} className="neo-flat rounded-3xl p-6 md:p-8 flex flex-col gap-4 transition-all hover:scale-[1.005]">
                    
                    {/* Entry Header block */}
                    <div className="flex flex-wrap justify-between items-start gap-3 border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-blue-500" />
                          <span className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                            {formattedDate}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {formattedTime}
                          </span>
                        </div>
                        
                        {/* Location and Weather badges */}
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          {entry.location && (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                              <MapPin size={10} className="text-red-400" />
                              {entry.location}
                            </span>
                          )}
                          {entry.weather && (
                            <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 flex items-center gap-0.5 neo-pressed px-2 py-0.5 rounded-full">
                              <CloudSun size={10} />
                              {entry.weather}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right-aligned Mood Badge & Actions */}
                      <div className="flex items-center gap-3">
                        {moodObj && (
                          <div className="neo-pressed px-3 py-1 rounded-full text-[11px] font-bold text-gray-700 dark:text-gray-200">
                            <span className="mr-1">{moodObj.emoji}</span>
                            {moodObj.label}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {!isEditing ? (
                            <>
                              <button 
                                onClick={() => startEdit(entry)}
                                className="p-2 neo-button rounded-xl border-none text-zinc-500 hover:text-blue-500 cursor-pointer transition-all"
                                title="Edit Entry"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-2 neo-button rounded-xl border-none text-zinc-500 hover:text-red-500 cursor-pointer transition-all"
                                title="Delete Entry"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => setEditingEntryId(null)}
                              className="px-2.5 py-1.5 neo-button rounded-xl border-none text-xs text-gray-500 cursor-pointer font-bold"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Entry Contents Block */}
                    {!isEditing ? (
                      <div className="flex flex-col gap-4">
                        {entry.title && (
                          <h3 className="text-lg font-extrabold text-gray-800 dark:text-gray-200 leading-tight m-0">
                            {entry.title}
                          </h3>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap m-0">
                          {entry.content}
                        </p>

                        {/* Attached Photos & Videos Carousel Grid */}
                        {entry.media && entry.media.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                            {entry.media.map(m => (
                              <div 
                                key={m.id} 
                                onClick={() => setActiveMediaUrl(m.url)}
                                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:opacity-90 shadow-sm transition-all"
                              >
                                {m.type === 'video' ? (
                                  <div className="w-full h-full relative">
                                    <video src={m.url} className="w-full h-full object-cover" muted />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-zinc-800 shadow-md">
                                        ▶
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img src={m.url} className="w-full h-full object-cover" alt="entry asset" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Inline Editor Row
                      <div className="flex flex-col gap-4 p-4 neo-pressed rounded-2xl">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Edit Title</label>
                          <input 
                            type="text" 
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="neo-pressed rounded-xl py-2 px-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none w-full border-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Edit Content</label>
                          <textarea 
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={4}
                            className="neo-pressed rounded-xl py-2.5 px-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none w-full resize-none border-none leading-relaxed"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Location</label>
                            <input 
                              type="text" 
                              value={editLocation}
                              onChange={e => setEditLocation(e.target.value)}
                              className="neo-pressed rounded-xl py-2 px-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none w-full border-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mood</label>
                            <select
                              value={editMood || ''}
                              onChange={e => setEditMood(e.target.value || null)}
                              className="neo-pressed rounded-xl py-2 px-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none w-full border-none bg-transparent"
                            >
                              <option value="">No Mood</option>
                              {MOODS.map(m => (
                                <option key={m.code} value={m.code}>{m.emoji} {m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSaveEdit(entry.id)}
                          className="neo-button py-2.5 rounded-xl text-xs font-black text-blue-500 uppercase tracking-widest border-none mt-1 hover:text-blue-600 cursor-pointer"
                        >
                          Save Changes 🏆
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Media Viewer Modal Overlay */}
      {activeMediaUrl && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setActiveMediaUrl(null)}
        >
          <button 
            className="absolute top-4 right-4 bg-zinc-800/80 text-white p-3 rounded-full hover:bg-zinc-700 transition-all border-none cursor-pointer"
            onClick={() => setActiveMediaUrl(null)}
          >
            <X size={20} />
          </button>
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {activeMediaUrl.toLowerCase().endsWith('.mp4') || activeMediaUrl.toLowerCase().endsWith('.mov') ? (
              <video 
                src={activeMediaUrl} 
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" 
                controls 
                autoPlay 
                onClick={(e) => e.stopPropagation()} 
              />
            ) : (
              <img 
                src={activeMediaUrl} 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
                alt="lightbox" 
                onClick={(e) => e.stopPropagation()} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
