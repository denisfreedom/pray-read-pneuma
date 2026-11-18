"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Admin Dashboard — REDESIGNED, front-page colours
// Ivory #faf8f2 / emerald #1d4035 / #17372f / gold #e9c981 / #a9852e
// LOGIC UNCHANGED: same /api/admin/dashboard-stats endpoint, same 30s refresh,
// same formatDate / getActiveStatus, same cards, tables, buttons, routes.
// Paste into the SAME file this came from (the standalone dashboard page),
// NOT into app/admin-panel/page.tsx — that file has its own Dashboard tab.

interface DashboardStats {
  totalUsers: number;
  todaySignups: number;
  weekSignups: number;
  activeUsers: number;
  locationStats: Array<{ country: string; city: string; count: string }>;
  recentSignups: Array<{
    id: number;
    name: string;
    email: string;
    country: string;
    city: string;
    created_at: string;
    last_active: string;
    is_active: boolean;
  }>;
  unreadMessages: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardStats() {
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    // Format without locale-dependent methods to avoid hydration mismatch
    return date.toISOString().split('T')[0] + ' ' + date.toISOString().split('T')[1].substring(0, 5);
  }

  function getActiveStatus(lastActive: string, isActive: boolean) {
    if (!lastActive) return 'Inactive';
    const now = new Date().getTime();
    const lastActiveTime = new Date(lastActive).getTime();
    const hoursDiff = (now - lastActiveTime) / (1000 * 60 * 60);

    if (hoursDiff < 1) return 'Online';
    if (hoursDiff < 24) return 'Active today';
    if (hoursDiff < 168) return 'Active this week';
    return 'Inactive';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f2] flex items-center justify-center">
        <div className="text-center">
          <img src="/assets/PrayRead-logo.png" alt="Pray-Read Bible" width={72} height={72} className="mx-auto mb-4 object-contain" />
          <div className="text-lg text-[#1d4035] font-semibold">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f2] text-[#22382f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-[11px] font-bold tracking-[2px] text-[#a9852e] uppercase">Pray-Read Bible &middot; Admin</p>
            <h1 className="text-3xl font-bold text-[#1d4035]">Admin Dashboard</h1>
            <p className="text-[#5a6a61] mt-1">Live statistics and user activity &mdash; refreshes every 30 seconds</p>
          </div>
          <button
            onClick={() => router.push('/admin-panel')}
            className="px-4 py-2 bg-[#1d4035] text-white rounded-lg hover:bg-[#17372f] transition font-semibold"
          >
            &larr; Back to Admin Panel
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow border border-[#ece4d0] p-6 border-l-4 border-l-[#1d4035]">
            <h3 className="text-[#5a6a61] text-sm font-medium mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-[#1d4035]">{stats?.totalUsers || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow border border-[#ece4d0] p-6 border-l-4 border-l-[#a9852e]">
            <h3 className="text-[#5a6a61] text-sm font-medium mb-1">Active Now</h3>
            <p className="text-3xl font-bold text-[#1d4035]">{stats?.activeUsers || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow border border-[#ece4d0] p-6 border-l-4 border-l-[#e9c981]">
            <h3 className="text-[#5a6a61] text-sm font-medium mb-1">New Today</h3>
            <p className="text-3xl font-bold text-[#1d4035]">{stats?.todaySignups || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow border border-[#ece4d0] p-6 border-l-4 border-l-[#1d4035]">
            <h3 className="text-[#5a6a61] text-sm font-medium mb-1">Unread Messages</h3>
            <p className="text-3xl font-bold text-[#1d4035]">{stats?.unreadMessages || 0}</p>
            <button
              onClick={() => router.push('/admin-panel/messages')}
              className="text-sm text-[#a9852e] hover:underline mt-2 font-semibold"
            >
              View Messages &rarr;
            </button>
          </div>
        </div>

        {/* Location Stats */}
        <div className="bg-white rounded-xl shadow border border-[#ece4d0] p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1d4035] mb-4">User Locations</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ece4d0]">
                  <th className="text-left py-2 px-4 text-[#5a6a61]">Country</th>
                  <th className="text-left py-2 px-4 text-[#5a6a61]">City</th>
                  <th className="text-right py-2 px-4 text-[#5a6a61]">Users</th>
                </tr>
              </thead>
              <tbody>
                {stats?.locationStats && stats.locationStats.length > 0 ? (
                  stats.locationStats.map((loc, index) => (
                    <tr key={index} className="border-b border-[#f3eedd] hover:bg-[#faf8f2]">
                      <td className="py-3 px-4">{loc.country || 'Unknown'}</td>
                      <td className="py-3 px-4">{loc.city || 'Unknown'}</td>
                      <td className="py-3 px-4 text-right font-semibold">{loc.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-[#5a6a61]">
                      No location data available yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-white rounded-xl shadow border border-[#ece4d0] p-6">
          <h2 className="text-xl font-bold text-[#1d4035] mb-4">Recent Signups</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ece4d0]">
                  <th className="text-left py-2 px-4 text-[#5a6a61]">Name</th>
                  <th className="text-left py-2 px-4 text-[#5a6a61]">Email</th>
                  <th className="text-left py-2 px-4 text-[#5a6a61]">Location</th>
                  <th className="text-left py-2 px-4 text-[#5a6a61]">Joined</th>
                  <th className="text-left py-2 px-4 text-[#5a6a61]">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentSignups && stats.recentSignups.length > 0 ? (
                  stats.recentSignups.map((user) => {
                    const status = getActiveStatus(user.last_active, user.is_active);
                    const statusColor =
                      status === 'Online' ? 'bg-[#e7f4ec] text-[#1d4035]' :
                      status === 'Active today' ? 'bg-[#faf8f2] text-[#a9852e] border border-[#e9c981]' :
                      status === 'Active this week' ? 'bg-[#f3eedd] text-[#5a6a61]' :
                      'bg-gray-100 text-gray-600';

                    return (
                      <tr key={user.id} className="border-b border-[#f3eedd] hover:bg-[#faf8f2]">
                        <td className="py-3 px-4 font-medium">{user.name}</td>
                        <td className="py-3 px-4 text-[#5a6a61]">{user.email}</td>
                        <td className="py-3 px-4 text-[#5a6a61]">
                          {user.country || user.city ? `${user.city || ''}, ${user.country || ''}` : 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-[#5a6a61] text-sm">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[#5a6a61]">
                      No signups yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
