"use client";

import React, { useEffect, useMemo, useState } from "react";

interface JournalEntryLite {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  location: string | null;
  weather: string | null;
  createdAt: string;
  updatedAt: string;
  media?: { id: string; type: string; url: string; caption: string | null }[];
  _count?: { media: number };
}

function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `${dayName}, ${dateStr}`;
}

function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  return date.toISOString().slice(0, 16);
}

const MOODS = [
  { code: "happy", label: "Happy" },
  { code: "reflective", label: "Reflective" },
  { code: "tired", label: "Tired" },
  { code: "focused", label: "Focused" },
  { code: "inspired", label: "Inspired" },
] as const;

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal state
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntryLite | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("");
  const [location, setLocation] = useState("New Haven, CT");
  const [entryDate, setEntryDate] = useState<string>("");

  // UI toggles per entry
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showMediaForEntries, setShowMediaForEntries] = useState<Set<string>>(new Set());

  const loadEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journal?lite=1&take=50", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load (${res.status})`);
      }
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.entries)) {
        throw new Error("Unexpected response shape");
      }
      setEntries(data.entries);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setMood("");
    setLocation("New Haven, CT");
    setEntryDate("");
  };

  const openNewEntryModal = () => {
    resetForm();
    setEntryDate(formatDateForInput(new Date().toISOString()));
    setEditingEntry(null);
    setShowNewEntryModal(true);
  };

  const openEditModal = (entry: JournalEntryLite) => {
    setTitle(entry.title || "");
    setContent(entry.content);
    setMood(entry.mood || "");
    setLocation(entry.location || "New Haven, CT");
    setEntryDate(formatDateForInput(entry.createdAt));
    setEditingEntry(entry);
    setShowNewEntryModal(true);
  };

  const closeModal = () => {
    setShowNewEntryModal(false);
    setEditingEntry(null);
    resetForm();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {
        title: title.trim() || null,
        content: content.trim(),
        mood: mood || null,
        location: location.trim() || "New Haven, CT",
        media: [],
      };

      // Include date if editing and date changed
      if (editingEntry && entryDate) {
        const newDate = new Date(entryDate).toISOString();
        const oldDate = new Date(editingEntry.createdAt).toISOString();
        if (newDate !== oldDate) {
          payload.createdAt = newDate;
        }
      }

      let res;
      if (editingEntry) {
        // Update existing entry
        res = await fetch(`/api/journal/${editingEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new entry
        res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      closeModal();
      await loadEntries();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/journal/${entryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Delete failed");
      }
      await loadEntries();
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  };

  const toggleMediaVisibility = (entryId: string) => {
    setShowMediaForEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const subtitle = useMemo(() => {
    if (isLoading) return "Loading entries...";
    if (error) return "Failed to load entries";
    return `${entries.length} recent entr${entries.length === 1 ? "y" : "ies"}`;
  }, [entries.length, error, isLoading]);

  return (
    <div className="p-6 min-h-screen bg-neo-bg text-gray-800 dark:text-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chronicles</h1>
          <p className="mt-3 text-sm">{subtitle}</p>
        </div>
        <button
          onClick={openNewEntryModal}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          + New Entry
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/50 bg-red-50/60 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => {
            const showMedia = showMediaForEntries.has(entry.id);
            const hasMedia = (entry._count?.media ?? 0) > 0;

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 bg-white/50 dark:bg-zinc-900/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateWithDay(entry.createdAt)}
                      {entry.weather ? ` • ${entry.weather}` : ""}
                      {entry.location ? ` • ${entry.location}` : ""}
                    </div>
                    {entry.title && <h2 className="mt-1 text-base font-semibold">{entry.title}</h2>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(entry)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                  {entry.content.length > 400 ? `${entry.content.slice(0, 400)}...` : entry.content}
                </p>

                {hasMedia && (
                  <div className="mt-3">
                    <button
                      onClick={() => toggleMediaVisibility(entry.id)}
                      className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
                    >
                      {showMedia ? "Hide" : "Show"} {entry._count?.media} attachment
                      {entry._count?.media === 1 ? "" : "s"}
                    </button>

                    {showMedia && entry.media && entry.media.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {entry.media.map((m) => (
                          <div key={m.id} className="rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-600">
                            {m.type === "image" ? (
                              <img src={m.url} alt={m.caption || "Attachment"} className="w-full h-24 object-cover" />
                            ) : m.type === "video" ? (
                              <video src={m.url} className="w-full h-24 object-cover" controls />
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-xs">
                                {m.type}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {!isLoading && entries.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No entries yet.</p>
          )}
        </div>
      )}

      {/* Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingEntry ? "Edit Entry" : "New Entry"}</h2>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm"
              />
              {editingEntry && (
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Entry Date & Time</label>
                  <input
                    type="datetime-local"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm"
                  />
                  <p className="text-xs text-zinc-400 mt-1">Changing the date will update the weather automatically</p>
                </div>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your entry..."
                rows={8}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm resize-y"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm"
                >
                  <option value="">No mood</option>
                  {MOODS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !content.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingEntry ? "Update" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
