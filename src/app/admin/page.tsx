'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  expected_guest_count: number;
  status: 'attending' | 'not_attending' | 'maybe' | null;
  actual_guest_count: number | null;
  dietary: string | null;
  message: string | null;
  submitted_at: string | null;
  created_at: string;
}

interface UnmatchedResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
  actual_guest_count: number | null;
  dietary: string | null;
  message: string | null;
  submitted_at: string;
}

interface Stats {
  totalInvitations: number;
  respondedAttending: number;
  respondedNotAttending: number;
  pending: number;
  totalPeopleAttending: number;
  totalPeopleNotAttending: number;
}

type FilterType = 'all' | 'attending' | 'not_attending' | 'pending';
type TabType = 'guests' | 'unmatched';

export default function AdminDashboard() {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedResponse[]>([]);
  const [stats, setStats] = useState<Stats>({ totalInvitations: 0, respondedAttending: 0, respondedNotAttending: 0, pending: 0, totalPeopleAttending: 0, totalPeopleNotAttending: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('guests');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ rows: string[][]; file: File } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [guestsRes, unmatchedRes] = await Promise.all([
        fetch('/api/admin/guests'),
        fetch('/api/admin/unmatched'),
      ]);

      if (!guestsRes.ok || !unmatchedRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const guestsData = await guestsRes.json();
      const unmatchedData = await unmatchedRes.json();

      setGuests(guestsData.guests);
      setStats(guestsData.stats);
      setUnmatched(unmatchedData.unmatched);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredGuests = useMemo(() => {
    let result = guests;

    // Apply status filter
    if (filter === 'attending') {
      result = result.filter(g => g.status === 'attending');
    } else if (filter === 'not_attending') {
      result = result.filter(g => g.status === 'not_attending');
    } else if (filter === 'pending') {
      result = result.filter(g => !g.status);
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(g =>
        g.first_name.toLowerCase().includes(searchLower) ||
        g.last_name.toLowerCase().includes(searchLower) ||
        g.phone.includes(search)
      );
    }

    return result;
  }, [guests, filter, search]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const copyPublicLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    window.location.href = '/api/admin/export';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const rows = lines.slice(0, 6).map(line => {
      // Simple CSV parsing for preview
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    setUploadPreview({ rows, file });
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!uploadPreview) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadPreview.file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setUploadResult(result);
        setUploadPreview(null);
        fetchData();
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateGuest = async (updates: Partial<Guest>) => {
    if (!selectedGuest) return;

    try {
      const res = await fetch('/api/admin/guests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedGuest.id, ...updates }),
      });

      if (res.ok) {
        fetchData();
        setSelectedGuest(null);
      } else {
        alert('Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Update failed');
    }
  };

  const handleLinkUnmatched = async (unmatchedId: string, guestId: string) => {
    try {
      const res = await fetch('/api/admin/unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unmatchedId, guestId }),
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('Link failed');
      }
    } catch (error) {
      console.error('Link error:', error);
      alert('Link failed');
    }
  };

  const handleAddAsGuest = async (unmatchedId: string) => {
    try {
      const res = await fetch('/api/admin/unmatched', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unmatchedId }),
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('Add failed');
      }
    } catch (error) {
      console.error('Add error:', error);
      alert('Add failed');
    }
  };

  const handleDeleteUnmatched = async (id: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const res = await fetch(`/api/admin/unmatched?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusPill = (status: string | null) => {
    if (status === 'attending') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Attending</span>;
    if (status === 'not_attending') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Not Attending</span>;
    if (status === 'maybe') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Maybe</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
  };

  const getDietaryLabel = (dietary: string | null) => {
    const labels: Record<string, string> = {
      regular: 'Regular',
      vegetarian: 'Vegetarian',
      vegan: 'Vegan',
      gluten_free: 'Gluten Free',
      other: 'Other',
    };
    return dietary ? labels[dietary] || dietary : '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center" dir="ltr">
        <div className="text-[#8B9A7A] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] admin-layout" dir="ltr">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold text-[#3D3D3D]">
            Noa & Ariel - Wedding RSVP Admin
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-[#6B6B6B] hover:text-[#3D3D3D] transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-semibold text-[#3D3D3D]">{stats.totalInvitations}</div>
            <div className="text-sm text-[#6B6B6B]">Invitations</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-semibold text-[#6B6B6B]">{stats.pending}</div>
            <div className="text-sm text-[#6B6B6B]">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-3xl font-semibold text-[#3D3D3D]">{stats.respondedAttending + stats.respondedNotAttending}</div>
            <div className="text-sm text-[#6B6B6B]">Responded</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-4xl font-semibold text-green-700">{stats.totalPeopleAttending}</div>
            <div className="text-sm text-green-600">People Attending</div>
            <div className="text-xs text-green-500 mt-1">({stats.respondedAttending} responses)</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-4xl font-semibold text-red-700">{stats.totalPeopleNotAttending}</div>
            <div className="text-sm text-red-600">People Not Attending</div>
            <div className="text-xs text-red-500 mt-1">({stats.respondedNotAttending} responses)</div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <label className="btn-primary cursor-pointer text-sm">
            Upload CSV
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <button onClick={copyPublicLink} className="btn-primary text-sm">
            {copied ? 'Copied ✓' : 'Copy Public Link'}
          </button>
          <button onClick={handleExport} className="btn-primary text-sm">
            Export CSV
          </button>
        </div>

        {/* Upload Preview Modal */}
        {uploadPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <h3 className="text-lg font-semibold mb-4">CSV Preview</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {uploadPreview.rows.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-gray-100 font-medium' : ''}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gray-200 px-3 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#6B6B6B] mb-4">
                Showing first {uploadPreview.rows.length - 1} rows. Total rows in file will be processed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
                <button
                  onClick={() => {
                    setUploadPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 text-[#6B6B6B] hover:text-[#3D3D3D]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="bg-white rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#8B9A7A] font-medium">{uploadResult.inserted} inserted</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-[#6B6B6B]">{uploadResult.skipped} skipped</span>
                {uploadResult.errors.length > 0 && (
                  <span className="text-[#8B5A5A] ml-2">({uploadResult.errors.length} errors)</span>
                )}
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="text-[#6B6B6B] hover:text-[#3D3D3D]"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('guests')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'guests'
                ? 'bg-[#8B9A7A] text-white'
                : 'bg-white text-[#6B6B6B] hover:bg-gray-50'
            }`}
          >
            Guests
          </button>
          <button
            onClick={() => setActiveTab('unmatched')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'unmatched'
                ? 'bg-[#8B9A7A] text-white'
                : 'bg-white text-[#6B6B6B] hover:bg-gray-50'
            }`}
          >
            Unmatched
            {unmatched.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unmatched.length}
              </span>
            )}
          </button>
        </div>

        {/* Guests Tab */}
        {activeTab === 'guests' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex gap-2">
                {(['all', 'attending', 'not_attending', 'pending'] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filter === f
                        ? 'bg-[#8B9A7A] text-white'
                        : 'bg-white text-[#6B6B6B] hover:bg-gray-50'
                    }`}
                  >
                    {f === 'all' && 'All'}
                    {f === 'attending' && 'Attending'}
                    {f === 'not_attending' && 'Not Attending'}
                    {f === 'pending' && 'Pending'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] text-sm"
              />
            </div>

            {/* Guests Table */}
            <div className="bg-white rounded-xl overflow-hidden">
              {filteredGuests.length === 0 ? (
                <div className="p-8 text-center text-[#6B6B6B]">
                  No guests found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Name</th>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Phone</th>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Status</th>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Actual</th>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Dietary</th>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Message</th>
                        <th className="px-4 py-3 font-medium text-[#6B6B6B]">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest) => (
                        <tr
                          key={guest.id}
                          onClick={() => setSelectedGuest(guest)}
                          className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            {guest.first_name} {guest.last_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{guest.phone}</td>
                          <td className="px-4 py-3">{getStatusPill(guest.status)}</td>
                          <td className="px-4 py-3">{guest.actual_guest_count || '-'}</td>
                          <td className="px-4 py-3">{getDietaryLabel(guest.dietary)}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate">
                            {guest.message || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6B6B6B]">
                            {formatDate(guest.submitted_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Unmatched Tab */}
        {activeTab === 'unmatched' && (
          <div className="bg-white rounded-xl overflow-hidden">
            {unmatched.length === 0 ? (
              <div className="p-8 text-center text-[#6B6B6B]">
                No unmatched responses
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {unmatched.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex flex-wrap gap-4 items-start justify-between">
                      <div>
                        <div className="font-medium text-[#3D3D3D]">
                          {item.first_name} {item.last_name}
                        </div>
                        <div className="text-sm text-[#6B6B6B] font-mono">{item.phone}</div>
                        <div className="flex gap-2 mt-2">
                          {getStatusPill(item.status)}
                          {item.actual_guest_count && (
                            <span className="text-sm text-[#6B6B6B]">
                              +{item.actual_guest_count - 1}
                            </span>
                          )}
                          {item.dietary && (
                            <span className="text-sm text-[#6B6B6B]">
                              {getDietaryLabel(item.dietary)}
                            </span>
                          )}
                        </div>
                        {item.message && (
                          <div className="text-sm text-[#6B6B6B] mt-2 italic">
                            "{item.message}"
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleLinkUnmatched(item.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="text-sm py-1.5"
                          defaultValue=""
                        >
                          <option value="">Link to guest...</option>
                          {guests.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.first_name} {g.last_name} ({g.phone})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddAsGuest(item.id)}
                          className="px-3 py-1.5 text-sm bg-[#8B9A7A] text-white rounded-lg hover:bg-[#6B7A5A]"
                        >
                          Add as Guest
                        </button>
                        <button
                          onClick={() => handleDeleteUnmatched(item.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Guest Edit Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Edit: {selectedGuest.first_name} {selectedGuest.last_name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Status
                </label>
                <select
                  value={selectedGuest.status || ''}
                  onChange={(e) => setSelectedGuest({
                    ...selectedGuest,
                    status: e.target.value as Guest['status'] || null,
                  })}
                  className="w-full"
                >
                  <option value="">Pending</option>
                  <option value="attending">Attending</option>
                  <option value="not_attending">Not Attending</option>
                  <option value="maybe">Maybe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Actual Guest Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedGuest.actual_guest_count || ''}
                  onChange={(e) => setSelectedGuest({
                    ...selectedGuest,
                    actual_guest_count: e.target.value ? parseInt(e.target.value) : null,
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Dietary
                </label>
                <select
                  value={selectedGuest.dietary || ''}
                  onChange={(e) => setSelectedGuest({
                    ...selectedGuest,
                    dietary: e.target.value || null,
                  })}
                  className="w-full"
                >
                  <option value="">None</option>
                  <option value="regular">Regular</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten_free">Gluten Free</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-1">
                  Message
                </label>
                <textarea
                  value={selectedGuest.message || ''}
                  onChange={(e) => setSelectedGuest({
                    ...selectedGuest,
                    message: e.target.value || null,
                  })}
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleUpdateGuest({
                  status: selectedGuest.status,
                  actual_guest_count: selectedGuest.actual_guest_count,
                  dietary: selectedGuest.dietary,
                  message: selectedGuest.message,
                })}
                className="btn-primary flex-1"
              >
                Save Changes
              </button>
              <button
                onClick={() => setSelectedGuest(null)}
                className="px-4 py-2 text-[#6B6B6B] hover:text-[#3D3D3D]"
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
