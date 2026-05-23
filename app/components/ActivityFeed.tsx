'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  Heart,
  Bookmark,
  BookOpen,
  Flame,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface Activity {
  activity_type: string;
  book_name?: string | null;
  book_number?: number | null;
  chapter?: number | null;
  verse_number?: number | null;
  created_at: string;
}

interface ActivityFeedProps {
  userEmail: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function ActivityFeed({
  userEmail,
  limit = 50,
  autoRefresh = true,
  refreshInterval = 10000
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadActivities = async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/activity-log?userEmail=${encodeURIComponent(userEmail)}&limit=${limit}`,
        { cache: 'no-store' }
      );
      const data = await response.json();

      if (data.success) {
        setActivities(data.activities || []);
      } else {
        setError(data.error || 'Failed to load activities');
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();

    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      await loadActivities();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [userEmail, limit, autoRefresh, refreshInterval]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivities();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'verse_view':
        return <Eye className="w-5 h-5 text-blue-400 flex-shrink-0" />;
      case 'prayer_view':
      case 'prayer_expanded':
        return <Heart className="w-5 h-5 text-purple-400 flex-shrink-0" />;
      case 'bookmark':
        return <Bookmark className="w-5 h-5 text-pink-400 flex-shrink-0" />;
      case 'book_visit':
        return <BookOpen className="w-5 h-5 text-cyan-400 flex-shrink-0" />;
      case 'devotional_access':
        return <Flame className="w-5 h-5 text-orange-400 flex-shrink-0" />;
      default:
        return <Clock className="w-5 h-5 text-white/40 flex-shrink-0" />;
    }
  };

  const getActivityLabel = (activity: Activity) => {
    const { activity_type, book_name, chapter, verse_number } = activity;

    switch (activity_type) {
      case 'verse_view':
        return `Viewed ${book_name} ${chapter}:${verse_number}`;
      case 'prayer_view':
        return `Viewed prayer for ${book_name} ${chapter}:${verse_number}`;
      case 'prayer_expanded':
        return `Expanded prayer for ${book_name} ${chapter}:${verse_number}`;
      case 'bookmark':
        return `Bookmarked ${book_name} ${chapter}:${verse_number}`;
      case 'book_visit':
        return `Visited ${book_name} ${chapter ? `Chapter ${chapter}` : ''}`;
      case 'devotional_access':
        return `Accessed ${book_name} - Day ${chapter}`;
      default:
        return 'Unknown activity';
    }
  };

  const getActivityLink = (activity: Activity) => {
    const { activity_type, book_number, chapter } = activity;

    if (activity_type === 'devotional_access') {
      return `/devotional-plans`;
    }

    if (book_number && chapter) {
      return `/bible-reader/${book_number}/${chapter}`;
    }

    return null;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/60">No activity yet. Start by reading the Bible or saving verses!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-50"
          title="Refresh activity feed"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activity Items */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {activities.map((activity, idx) => {
          const link = getActivityLink(activity);
          const label = getActivityLabel(activity);
          const time = formatTime(activity.created_at);

          const content = (
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
              {getActivityIcon(activity.activity_type)}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {label}
                </div>
                <div className="text-white/50 text-xs">
                  {time}
                </div>
              </div>
              {link && (
                <ExternalLink className="w-4 h-4 text-white/40 flex-shrink-0" />
              )}
            </div>
          );

          return link ? (
            <Link key={idx} href={link} className="block hover:no-underline">
              {content}
            </Link>
          ) : (
            <div key={idx}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Activity Summary */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-white/60 text-xs text-center">
          Showing {activities.length} recent activities
        </div>
      </div>
    </div>
  );
}
