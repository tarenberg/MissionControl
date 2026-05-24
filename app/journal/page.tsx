"use client";

import React, { useEffect, useMemo, useState } from "react";

interface JournalEntryLite {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  location: string | null;
  createdAt: string;
  media?: { type: string }[];
  _count?: { media: number };
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

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("");
  const [location, setLocation] = useState("New Haven, CT");

  const loadEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journal?lite=1&take=20", { cache: "no-store" });
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          mood: mood || null,
          location: location.trim() || "New Haven, CT",
          media: [],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      setTitle("");
      setContent("");
      setMood("");
      await loadEntries();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const subtitle = useMemo(() => {
    if (isLoading) return "Loading entries...";
    if (error) return "Failed to load entries";
    return `${entries.length} recent entr${entries.length === 1 ? "y" : "ies"}`;
  }, [entries.length, error, isLoading]);

  return (
    <div className="p-6 min-h-screen bg-neo-bg text-gray-800 dark:text-gray-200">
      <h1 className="text-2xl font-bold">Chronicles</h1>
      <p className="mt-3 text-sm">{subtitle}</p>

      <form onSubmit={handleCreate} className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 bg-white/60 dark:bg-zinc-900/30 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your entry..."
          rows={5}
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
        <button
          type="submit"
          disabled={isSaving || !content.trim()}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Entry"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/50 bg-red-50/60 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 bg-white/50 dark:bg-zinc-900/30">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(entry.createdAt).toLocaleString("en-US")}
                {entry.location ? ` • ${entry.location}` : ""}
              </div>
              {entry.title && <h2 className="mt-1 text-base font-semibold">{entry.title}</h2>}
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                {entry.content.length > 400 ? `${entry.content.slice(0, 400)}...` : entry.content}
              </p>
              {!!entry._count?.media && (
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{entry._count.media} attachment{entry._count.media === 1 ? "" : "s"}</span>
                  {!!entry.media?.some((m) => m.type === "image") && (
                    <span className="rounded-full border border-zinc-300 dark:border-zinc-600 px-2 py-0.5">image</span>
                  )}
                  {!!entry.media?.some((m) => m.type === "video") && (
                    <span className="rounded-full border border-zinc-300 dark:border-zinc-600 px-2 py-0.5">video</span>
                  )}
                </div>
              )}
            </article>
          ))}
          {!isLoading && entries.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No entries yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
