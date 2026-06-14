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

interface JournalStats {
  totalEntries: number;
  avgContentLength: number;
  moodCounts: Record<string, number>;
  locationCounts: Record<string, number>;
  dateRange: { earliest: string; latest: string } | null;
  entriesWithAttachments: number;
  totalAttachments: number;
}

function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `${dayName}, ${dateStr}`;
}

function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

const MOODS = [
  { code: "happy", label: "Happy" },
  { code: "reflective", label: "Reflective" },
  { code: "tired", label: "Tired" },
  { code: "focused", label: "Focused" },
  { code: "inspired", label: "Inspired" },
] as const;

function calculateStats(entries: JournalEntryLite[]): JournalStats {
  const moodCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  let totalAttachments = 0;
  let entriesWithAttachments = 0;
  let totalContentLength = 0;

  entries.forEach((entry) => {
    totalContentLength += entry.content.length;
    if (entry.mood) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
    if (entry.location) {
      locationCounts[entry.location] = (locationCounts[entry.location] || 0) + 1;
    }
    const mediaCount = entry._count?.media || 0;
    if (mediaCount > 0) {
      entriesWithAttachments += 1;
      totalAttachments += mediaCount;
    }
  });

  const dateRange =
    entries.length > 0
      ? {
          earliest: entries[entries.length - 1]?.createdAt || new Date().toISOString(),
          latest: entries[0]?.createdAt || new Date().toISOString(),
        }
      : null;

  return {
    totalEntries: entries.length,
    avgContentLength: entries.length > 0 ? Math.round(totalContentLength / entries.length) : 0,
    moodCounts,
    locationCounts,
    dateRange,
    entriesWithAttachments,
    totalAttachments,
  };
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterHasAttachments, setFilterHasAttachments] = useState(false);
  const [showStats, setShowStats] = useState(true);

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
      const res = await fetch("/api/journal?lite=1&take=500", { cache: "no-store" });
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

      if (editingEntry && entryDate) {
        const newDate = new Date(entryDate).toISOString();
        const oldDate = new Date(editingEntry.createdAt).toISOString();
        if (newDate !== oldDate) {
          payload.createdAt = newDate;
        }
      }

      let res;
      if (editingEntry) {
        res = await fetch(`/api/journal/${editingEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
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

  // Filter entries based on search & filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        searchQuery === "" ||
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMood = filterMood === "" || entry.mood === filterMood;
      const matchesLocation = filterLocation === "" || entry.location === filterLocation;
      const matchesAttachments = !filterHasAttachments || (entry._count?.media ?? 0) > 0;

      return matchesSearch && matchesMood && matchesLocation && matchesAttachments;
    });
  }, [entries, searchQuery, filterMood, filterLocation, filterHasAttachments]);

  const stats = useMemo(() => calculateStats(entries), [entries]);
  const filteredStats = useMemo(() => calculateStats(filteredEntries), [filteredEntries]);

  const subtitle = useMemo(() => {
    if (isLoading) return "Loading entries...";
    if (error) return "Failed to load entries";
    if (searchQuery || filterMood || filterLocation || filterHasAttachments) {
      return `${filteredEntries.length} of ${entries.length} entr${filteredEntries.length === 1 ? "y" : "ies"} match filters`;
    }
    return `${entries.length} total entr${entries.length === 1 ? "y" : "ies"}`;
  }, [entries.length, filteredEntries.length, error, isLoading, searchQuery, filterMood, filterLocation, filterHasAttachments]);

  return (
    <div className="p-6 min-h-screen bg-neo-bg text-gray-800 dark:text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter">Chronicles</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <button
          onClick={openNewEntryModal}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-sm font-bold transition-colors shadow-lg"
        >
          + New Entry
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/50 bg-red-50/60 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entries by title, content, or location..."
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 p-3 text-sm placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 p-2 text-sm"
          >
            <option value="">All moods</option>
            {MOODS.map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 p-2 text-sm"
          >
            <option value="">All locations</option>
            {Object.keys(stats.locationCounts)
              .sort()
              .map((loc) => (
                <option key={loc} value={loc}>
                  {loc} ({stats.locationCounts[loc]})
                </option>
              ))}
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 p-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
            <input
              type="checkbox"
              checked={filterHasAttachments}
              onChange={(e) => setFilterHasAttachments(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Has attachments ({stats.entriesWithAttachments})</span>
          </label>

          <button
            onClick={() => setShowStats(!showStats)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 p-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 font-medium transition-colors"
          >
            {showStats ? "Hide Stats" : "Show Stats"}
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && !isLoading && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl neo-pressed p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Total Entries</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{filteredStats.totalEntries}</div>
          </div>

          <div className="rounded-xl neo-pressed p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Avg. Length</div>
            <div className="text-2xl font-black text-green-600 dark:text-green-400">{filteredStats.avgContentLength}</div>
            <div className="text-xs text-gray-400 mt-1">chars per entry</div>
          </div>

          <div className="rounded-xl neo-pressed p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Attachments</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{filteredStats.totalAttachments}</div>
            <div className="text-xs text-gray-400 mt-1">in {filteredStats.entriesWithAttachments} entries</div>
          </div>

          <div className="rounded-xl neo-pressed p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Date Range</div>
            {filteredStats.dateRange ? (
              <div className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-tight mt-1">
                <div>{new Date(filteredStats.dateRange.latest).toLocaleDateString()}</div>
                <div className="text-center text-gray-400">—</div>
                <div>{new Date(filteredStats.dateRange.earliest).toLocaleDateString()}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">No entries</div>
            )}
          </div>
        </div>
      )}

      {/* Mood Distribution (if stats shown) */}
      {showStats && Object.keys(stats.moodCounts).length > 0 && (
        <div className="mb-6 rounded-xl neo-pressed p-4 border border-gray-200/50 dark:border-gray-700/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-3">Mood Distribution</div>
          <div className="flex gap-2 flex-wrap">
            {MOODS.map((mood) => {
              const count = stats.moodCounts[mood.code] || 0;
              return count > 0 ? (
                <div key={mood.code} className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full">
                  {mood.label} ({count})
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Entries List */}
      {!error && (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const showMedia = showMediaForEntries.has(entry.id);
            const hasMedia = (entry._count?.media ?? 0) > 0;

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-white/60 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-widest mb-1">
                      {formatDateWithDay(entry.createdAt)}
                      {entry.weather ? ` • ${entry.weather}` : ""}
                      {entry.location ? ` • ${entry.location}` : ""}
                    </div>
                    {entry.title && <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{entry.title}</h2>}
                    {entry.mood && (
                      <div className="mt-2 text-xs inline-block bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full font-semibold">
                        {entry.mood}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(entry)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:font-bold transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:font-bold transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-6 text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
                  {entry.content.length > 300 ? `${entry.content.slice(0, 300)}...` : entry.content}
                </p>

                {hasMedia && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => toggleMediaVisibility(entry.id)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 mb-3"
                    >
                      <span>{showMedia ? "🔽" : "▶️"}</span>
                      {showMedia ? "Hide" : "Show"} {entry._count?.media} attachment{entry._count?.media === 1 ? "" : "s"}
                    </button>

                    {showMedia && entry.media && entry.media.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {entry.media.map((m) => (
                          <div key={m.id} className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-md hover:shadow-lg transition-shadow">
                            {m.type === "image" ? (
                              <img src={m.url} alt={m.caption || "Attachment"} className="w-full h-28 object-cover" />
                            ) : m.type === "video" ? (
                              <video src={m.url} className="w-full h-28 object-cover" controls />
                            ) : (
                              <div className="w-full h-28 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
                                {m.type}
                              </div>
                            )}
                            {m.caption && <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 text-gray-700 dark:text-gray-300 truncate">{m.caption}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {!isLoading && filteredEntries.length === 0 && entries.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No entries match your filters.</p>
          )}

          {!isLoading && entries.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No entries yet. Start your first chronicle entry!</p>
          )}
        </div>
      )}

      {/* Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-300 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{editingEntry ? "Edit Entry" : "New Entry"}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-3 text-sm"
              />
              {editingEntry && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2 font-bold">Entry Date & Time</label>
                  <input
                    type="datetime-local"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-3 text-sm"
                  />
                </div>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your entry..."
                rows={10}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-3 text-sm resize-y font-mono"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-3 text-sm"
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
                  className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-3 text-sm"
                />
              </div>
              <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-300 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !content.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 text-sm font-bold transition-colors"
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
