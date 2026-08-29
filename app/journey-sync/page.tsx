"use client";

import React, { useState, useEffect, useMemo } from 'react';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  location?: string;
  weather?: string;
  tags?: string;
  date?: string;
  createdAt: string;
  updatedAt: string;
  media?: Array<{ id: string; url: string; type: string; caption?: string; filename: string }> | string;
}

interface Stats {
  total: number;
  byMood: Record<string, number>;
  locations: string[];
  dateRange: { oldest: string; newest: string };
}

const MOOD_COLORS: Record<string, string> = {
  happy: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  sad: 'bg-blue-100 text-blue-800 border-blue-300',
  anxious: 'bg-red-100 text-red-800 border-red-300',
  calm: 'bg-green-100 text-green-800 border-green-300',
  excited: 'bg-purple-100 text-purple-800 border-purple-300',
  thoughtful: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  nostalgic: 'bg-pink-100 text-pink-800 border-pink-300',
  default: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function JourneySyncPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title'>('date-desc');
  const [showStats, setShowStats] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<JournalEntry & { uploadedMedia: Array<{ url: string; filename: string; type: string }> }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ url: string; filename: string; type: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // Backup/restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/journey-sync');
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data.entries || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo((): Stats => {
    const byMood: Record<string, number> = {};
    const locations = new Set<string>();
    let oldest = entries[0]?.createdAt;
    let newest = entries[0]?.createdAt;

    entries.forEach((entry) => {
      if (entry.mood) {
        byMood[entry.mood] = (byMood[entry.mood] || 0) + 1;
      }
      if (entry.location) {
        locations.add(entry.location);
      }
      if (entry.createdAt < oldest) oldest = entry.createdAt;
      if (entry.createdAt > newest) newest = entry.createdAt;
    });

    return {
      total: entries.length,
      byMood,
      locations: Array.from(locations),
      dateRange: { oldest, newest },
    };
  }, [entries]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.content.toLowerCase().includes(query) ||
          entry.location?.toLowerCase().includes(query)
      );
    }

    // Mood filter
    if (selectedMood !== 'all') {
      result = result.filter((entry) => entry.mood === selectedMood);
    }

    // Location filter
    if (selectedLocation !== 'all') {
      result = result.filter((entry) => entry.location === selectedLocation);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [entries, searchQuery, selectedMood, selectedLocation, sortBy]);

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.content) {
        alert('Title and content are required');
        return;
      }

      const payload = {
        ...formData,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      };

      const response = await fetch('/api/journey-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create entry');

      setFormData({});
      setUploadedMedia([]);
      setShowCreateForm(false);
      await fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create entry');
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editingId) return;

      const payload = {
        id: editingId,
        ...formData,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      };

      const response = await fetch('/api/journey-sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update entry');

      setFormData({});
      setUploadedMedia([]);
      setEditingId(null);
      setShowModal(false);
      setSelectedEntry(null);
      await fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;

    try {
      const response = await fetch(`/api/journey-sync?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete entry');

      setShowModal(false);
      setSelectedEntry(null);
      await fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const openEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setFormData(entry);
    setEditingId(entry.id);
    setUploadedMedia(Array.isArray(entry.media) ? entry.media : []);
    setShowModal(true);
  };

  const getMoodColor = (mood?: string) => MOOD_COLORS[mood || 'default'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await fetch('/api/journal/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();

        setUploadedMedia((prev) => [
          ...prev,
          { url: data.url, filename: data.filename, type: data.type },
        ]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeUploadedMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('/api/journal/backup');
      if (!response.ok) throw new Error('Backup failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journey-sync-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowBackupMenu(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setRestoreLoading(true);
    try {
      const formDataRestore = new FormData();
      formDataRestore.append('file', files[0]);

      const response = await fetch('/api/journal/backup/restore', {
        method: 'POST',
        body: formDataRestore,
      });

      if (!response.ok) throw new Error('Restore failed');
      const result = await response.json();

      alert(`Restore complete: ${result.message}\n\nCreated: ${result.results.created}\nUpdated: ${result.results.updated}\nFailed: ${result.results.failed}`);
      setShowBackupMenu(false);
      await fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    try {
      const locationQuery = formData.location || 'New Haven, CT';
      const response = await fetch(`/api/journal/weather?location=${encodeURIComponent(locationQuery)}`);

      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        location: data.location,
        weather: data.weather,
        date: new Date().toISOString(),
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to auto-fill weather');
    } finally {
      setAutoFilling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 relative z-50">
        <div className="max-w-7xl mx-auto px-6 py-8 relative">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Journey Sync</h1>
              <p className="text-slate-600 mt-1">Your personal chronicles, synced</p>
            </div>
            <div className="flex gap-2 relative z-50">
              <div className="relative z-50">
                <button
                  onClick={() => setShowBackupMenu(!showBackupMenu)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition text-sm"
                >
                  💾 Backup
                </button>
                {showBackupMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                    <button
                      onClick={handleBackup}
                      disabled={backupLoading}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 rounded-t-lg text-sm"
                    >
                      {backupLoading ? 'Exporting...' : 'Export All Entries'}
                    </button>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestore}
                        disabled={restoreLoading}
                        className="hidden"
                      />
                      <div className="block w-full text-left px-4 py-2 hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400 rounded-b-lg text-sm">
                        {restoreLoading ? 'Restoring...' : 'Restore from File'}
                      </div>
                    </label>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setFormData({});
                  setEditingId(null);
                  setShowCreateForm(true);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                New Entry
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by title, content, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Moods</option>
              {Object.keys(MOOD_COLORS)
                .filter((m) => m !== 'default')
                .map((mood) => (
                  <option key={mood} value={mood}>
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </option>
                ))}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {stats.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showStats ? 'Hide Stats' : 'Show Stats'} ({stats.total} entries)
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-sm text-slate-600">Total Entries</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">By Mood</div>
                {Object.entries(stats.byMood).map(([mood, count]) => (
                  <div key={mood} className="text-xs text-slate-600">
                    {mood}: {count}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">Locations</div>
                <div className="text-xs text-slate-600">{stats.locations.length} unique</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">Date Range</div>
                <div className="text-xs text-slate-600">
                  {formatDate(stats.dateRange.oldest)} to {formatDate(stats.dateRange.newest)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading entries...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            {searchQuery || selectedMood !== 'all' || selectedLocation !== 'all'
              ? 'No entries match your filters'
              : 'No entries yet'}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => openEntry(entry)}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition cursor-pointer p-6"
              >
                <div className="flex gap-4">
                  {/* Media Thumbnail */}
                  {entry.media && Array.isArray(entry.media) && entry.media.length > 0 && (
                    <div className="flex-shrink-0 w-20 h-20 bg-slate-200 rounded-lg overflow-hidden">
                      <img
                        src={entry.media[0].url}
                        alt={entry.media[0].caption || entry.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-image.svg';
                          e.currentTarget.style.backgroundColor = '#e5e7eb';
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">
                      {entry.title}
                    </h3>
                    <p className="text-slate-600 line-clamp-2 mt-1">{entry.content}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {entry.mood && (
                        <span className={`px-2 py-1 text-xs rounded font-medium border ${getMoodColor(entry.mood)}`}>
                          {entry.mood}
                        </span>
                      )}
                      {entry.location && (
                        <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700 border border-slate-300">
                          📍 {entry.location}
                        </span>
                      )}
                      {entry.weather && (
                        <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700 border border-slate-300">
                          {entry.weather}
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs text-slate-500">
                        📅 {formatDate(entry.date ? entry.date : entry.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: View/Edit Entry */}
      {showModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingId ? 'Edit Entry' : 'View Entry'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedEntry(null);
                  setEditingId(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Content
                </label>
                <textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-40 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mood</label>
                <select
                  value={formData.mood || ''}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600"
                >
                  <option value="">Select a mood...</option>
                  {Object.keys(MOOD_COLORS)
                    .filter((m) => m !== 'default')
                    .map((mood) => (
                      <option key={mood} value={mood}>
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location (for weather)
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600"
                  placeholder="e.g., New Haven, CT"
                />
              </div>

              {/* Weather */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Weather
                  </label>
                  {editingId && (
                    <button
                      onClick={handleAutoFill}
                      disabled={autoFilling}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-slate-400"
                    >
                      {autoFilling ? 'Fetching...' : 'Auto-fill'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.weather || ''}
                  onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600"
                  placeholder="e.g., Sunny 72F"
                />
              </div>

              {/* Entry Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Entry Date
                </label>
                <input
                  type="date"
                  value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              {/* Created At */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Created At
                </label>
                <p className="text-sm text-slate-600">{formatDate(selectedEntry.createdAt)}</p>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Media {uploadedMedia.length > 0 && `(${uploadedMedia.length})`}
                </label>
                {editingId && (
                  <div className="mb-3">
                    <label className="block w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      <span className="text-sm text-slate-600">
                        {uploading ? 'Uploading...' : '+ Add Media'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/mp4"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Display existing media from entry */}
                {selectedEntry.media && Array.isArray(selectedEntry.media) && selectedEntry.media.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Original Media</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEntry.media.map((m, idx) => (
                        <div key={`orig-${idx}`} className="relative">
                          {m.type === 'image' && (
                            <img
                              src={m.url}
                              alt={m.caption || `Media ${idx + 1}`}
                              className="w-full rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-image.svg';
                                e.currentTarget.style.backgroundColor = '#e5e7eb';
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display newly uploaded media */}
                {uploadedMedia.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">New Media</p>
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedMedia.map((m, idx) => (
                        <div key={`new-${idx}`} className="relative">
                          {m.type === 'image' && (
                            <>
                              <img
                                src={m.url}
                                alt={m.filename}
                                className="w-full rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-image.svg';
                                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                                }}
                              />
                              {editingId && (
                                <button
                                  onClick={() => removeUploadedMedia(idx)}
                                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                                >
                                  ✕
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Weather */}
              {selectedEntry.weather && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Weather
                  </label>
                  <p className="text-sm text-slate-600">{selectedEntry.weather}</p>
                </div>
              )}

              {/* Entry Date */}
              {selectedEntry.date && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Entry Date
                  </label>
                  <p className="text-sm text-slate-600">{formatDate(selectedEntry.date)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 flex gap-2 justify-end bg-slate-50">
              {editingId ? (
                <>
                  <button
                    onClick={() => handleUpdate()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => handleDelete(editingId)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                  >
                    Delete
                  </button>
                </>
              ) : null}
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedEntry(null);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Entry */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">New Entry</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({});
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entry title..."
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Content
                </label>
                <textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your entry..."
                />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mood</label>
                <select
                  value={formData.mood || ''}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a mood...</option>
                  {Object.keys(MOOD_COLORS)
                    .filter((m) => m !== 'default')
                    .map((mood) => (
                      <option key={mood} value={mood}>
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location (for weather)
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., New Haven, CT"
                />
              </div>

              {/* Weather */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Weather
                  </label>
                  <button
                    onClick={handleAutoFill}
                    disabled={autoFilling}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-slate-400"
                  >
                    {autoFilling ? 'Fetching...' : 'Auto-fill'}
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.weather || ''}
                  onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sunny 72F"
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Media {uploadedMedia.length > 0 && `(${uploadedMedia.length})`}
                </label>
                <label className="block w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <span className="text-sm text-slate-600">
                    {uploading ? 'Uploading...' : '+ Add Media'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/mp4"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>

                {/* Display newly uploaded media */}
                {uploadedMedia.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Uploads</p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedMedia.map((m, idx) => (
                        <div key={`new-${idx}`} className="relative">
                          {m.type === 'image' && (
                            <>
                              <Image
                                src={m.url}
                                alt={m.filename}
                                width={100}
                                height={100}
                                className="w-full rounded-lg object-cover"
                                unoptimized
                              />
                              <button
                                onClick={() => removeUploadedMedia(idx)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Entry Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Entry Date
                </label>
                <input
                  type="date"
                  value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 flex gap-2 justify-end bg-slate-50">
              <button
                onClick={() => handleCreate()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Create Entry
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({});
                  setUploadedMedia([]);
                }}
                className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
