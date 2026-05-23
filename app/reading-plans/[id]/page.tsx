'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BookOpen, Calendar, CheckCircle2, Circle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useThemeStore } from '@/lib/theme-store';

interface ReadingPlan {
  id: number;
  title: string;
  description: string;
  duration_days: number;
  icon: string;
}

interface PlanDay {
  id: number;
  day_number: number;
  book: string;
  book_number: number | null;
  start_chapter: number;
  end_chapter: number;
  total_chapters: number | null;
}

interface UserProgress {
  day_number: number;
  completed: boolean;
}

export default function ReadingPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [progress, setProgress] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get user email from session first, fallback to localStorage
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(s => {
        const email = s?.user?.email || localStorage.getItem('userEmail') || 'guest@example.com';
        setUserEmail(email);
      })
      .catch(() => setUserEmail(localStorage.getItem('userEmail') || 'guest@example.com'));

    fetchPlanDetails();
  }, [planId]);

  async function fetchPlanDetails() {
    try {
      // Fetch plan and days
      const res = await fetch(`/api/reading-plans/${planId}`);
      const data = await res.json();
      
      setPlan(data.plan);
      setDays(data.days || []);

      // Fetch user progress
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
      const sessionData = await sessionRes.json();
      const email = sessionData?.user?.email || localStorage.getItem('userEmail') || 'guest@example.com';
      const progressRes = await fetch(`/api/reading-progress?email=${email}&planId=${planId}`);
      const progressData = await progressRes.json();

      const progressMap = new Map<number, boolean>();
      (progressData.progress || []).forEach((p: UserProgress) => {
        progressMap.set(p.day_number, p.completed);
      });
      setProgress(progressMap);
    } catch (error) {
      console.error('Error fetching plan details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleDayCompletion(dayNumber: number) {
    const currentStatus = progress.get(dayNumber) || false;
    const newStatus = !currentStatus;

    // Optimistic update
    const newProgress = new Map(progress);
    newProgress.set(dayNumber, newStatus);
    setProgress(newProgress);

    try {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
      const sessionData = await sessionRes.json();
      const email = sessionData?.user?.email || userEmail;

      await fetch('/api/reading-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: email,
          planId: parseInt(planId),
          dayNumber,
          completed: newStatus,
        }),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      setProgress(progress);
    }
  }

  const completedDays = Array.from(progress.values()).filter(Boolean).length;
  const progressPercentage = days.length > 0 ? (completedDays / days.length) * 100 : 0;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'dark:bg-gradient-to-br dark:from-[#06090f] dark:via-[#0a0e17] dark:to-[#08060e]' : 'bg-gradient-to-br from-white via-gray-50 to-white'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[rgba(180,140,60,0.2)] border-t-[#f0c060] rounded-full animate-spin" />
          <p className={`mt-4 text-sm ${isDark ? 'dark:text-[rgba(220,200,155,0.5)]' : 'text-gray-500'}`}>Loading reading plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={`min-h-screen ${isDark ? 'dark:bg-gradient-to-br dark:from-[#06090f] dark:via-[#0a0e17] dark:to-[#08060e]' : 'bg-gradient-to-br from-white via-gray-50 to-white'} flex items-center justify-center`}>
        <div className="text-center">
          <h2 className={`font-serif text-2xl mb-4 ${isDark ? 'dark:text-[#f5ece0]' : 'text-gray-900'}`}>Plan not found</h2>
          <button onClick={() => router.push('/reading-plans')} className="btn-ghost px-6 py-3 rounded-xl">
            ← Back to Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark:bg-gradient-to-br dark:from-[#06090f] dark:via-[#0a0e17] dark:to-[#08060e]' : 'bg-gradient-to-br from-white via-gray-50 to-white'}`}>
      {/* Header */}
      <header className={`glass-nav border-b border-[rgba(180,140,60,0.15)] ${isDark ? 'dark' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => router.push('/reading-plans')}
            className="flex items-center gap-3 group"
          >
            <ArrowLeft className="w-5 h-5 text-[#f0c060]" />
            <span className={`font-serif text-xl font-semibold ${isDark ? 'dark:text-[#f5ece0]' : 'text-gray-900'}`}>
              {plan.title}
            </span>
          </button>
          <div className="text-sm font-semibold text-[#f0c060]">
            {completedDays} / {days.length} days
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Plan Header Card */}
        <div className={`rounded-3xl p-8 md:p-12 mb-12 ${isDark ? 'dark-card' : 'light-card'}`}
          style={{ background: 'linear-gradient(135deg, rgba(200,160,50,0.04) 0%, rgba(180,140,60,0.07) 100%)', border: '1px solid rgba(180,140,60,0.18)' }}>
          
          <div className="flex items-start gap-6 mb-8">
            <div className="icon-box w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
              {plan.icon}
            </div>
            <div className="flex-1">
              <h1 className={`font-serif text-3xl md:text-4xl font-semibold mb-3 ${isDark ? 'text-[#f0d890]' : 'text-[#c9900a]'}`}>
                {plan.title}
              </h1>
              <p className={`text-base leading-relaxed mb-4 ${isDark ? 'dark:text-[rgba(220,200,155,0.65)]' : 'text-gray-600'}`}>
                {plan.description}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#f0c060]" />
                  <span className={isDark ? 'dark:text-[rgba(220,200,155,0.7)]' : 'text-gray-600'}>
                    {plan.duration_days} days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#f0c060]" />
                  <span className={isDark ? 'dark:text-[rgba(220,200,155,0.7)]' : 'text-gray-600'}>
                    {completedDays} completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-semibold text-[#f0c060]">Overall Progress</span>
              <span className={isDark ? 'dark:text-[rgba(220,200,155,0.7)]' : 'text-gray-600'}>
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden"
              style={{ background: 'rgba(180,140,60,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                  background: 'linear-gradient(90deg, #c9900a, #f0c040)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Reading Schedule */}
        <div className="space-y-4">
          <h2 className={`font-serif text-2xl font-semibold mb-6 ${isDark ? 'dark:text-[#f5ece0]' : 'text-gray-900'}`}>
            Reading Schedule
          </h2>

          {days.map((day) => {
            const isCompleted = progress.get(day.day_number) || false;
            const chapterRange = day.start_chapter === day.end_chapter
              ? `Chapter ${day.start_chapter}`
              : `Chapters ${day.start_chapter}-${day.end_chapter}`;

            return (
              <div
                key={day.id}
                className={`rounded-2xl p-6 border transition-all cursor-pointer ${
                  isCompleted
                    ? 'border-[rgba(180,140,60,0.4)] bg-[rgba(180,140,60,0.08)]'
                    : `border-[rgba(180,140,60,0.18)] ${isDark ? 'bg-[rgba(200,160,50,0.06)] hover:bg-[rgba(200,160,50,0.1)]' : 'bg-[rgba(200,160,50,0.04)] hover:bg-[rgba(200,160,50,0.07)]'}`
                }`}
                onClick={() => toggleDayCompletion(day.day_number)}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <button
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDayCompletion(day.day_number);
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-[#f0c060]" />
                    ) : (
                      <Circle className="w-6 h-6 text-[rgba(180,140,60,0.4)]" />
                    )}
                  </button>

                  {/* Day Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#f0c060]">
                        Day {day.day_number}
                      </span>
                      {isCompleted && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(180,140,60,0.2)', color: '#f0c060' }}>
                          ✓ Complete
                        </span>
                      )}
                    </div>
                    <p className={`font-semibold text-base ${isDark ? 'dark:text-[#f5ece0]' : 'text-gray-900'}`}>
                      {day.book} · {chapterRange}
                    </p>
                  </div>

                  {/* Read Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (day.book_number) {
                        router.push(`/bible-reader/${day.book_number}/${day.start_chapter}?planId=${planId}&dayNumber=${day.day_number}`);
                      } else {
                        router.push(`/bible-reader`);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm btn-ghost"
                  >
                    Read
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Encouragement Message */}
        {completedDays === days.length && (
          <div className={`mt-12 rounded-3xl p-8 text-center ${isDark ? 'dark-complete' : 'light-complete'}`}
            style={{ background: 'linear-gradient(135deg, rgba(200,160,50,0.1) 0%, rgba(180,140,60,0.15) 100%)', border: '1px solid rgba(180,140,60,0.3)' }}>
            <div className="text-5xl mb-4">🎉</div>
            <h3 className={`font-serif text-2xl font-semibold mb-3 ${isDark ? 'text-[#f0d890]' : 'text-[#c9900a]'}`}>
              Congratulations!
            </h3>
            <p className={`text-base mb-6 ${isDark ? 'dark:text-[rgba(220,200,155,0.7)]' : 'text-gray-600'}`}>
              You've completed the {plan.title}! Keep growing in the Word.
            </p>
            <button
              onClick={() => router.push('/reading-plans')}
              className="px-8 py-3 rounded-xl text-sm btn-gold"
            >
              Explore More Plans
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        .glass-nav {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .dark .glass-nav {
          background: rgba(6,9,15,0.82);
        }

        .btn-gold {
          background: linear-gradient(135deg, #c9900a 0%, #f0c040 45%, #e0a820 80%, #c9900a 100%);
          background-size: 200% 100%;
          color: #0d0a02;
          font-weight: 700;
          letter-spacing: 0.04em;
          transition: all 0.4s cubic-bezier(.16,1,.3,1);
          box-shadow: 0 4px 24px rgba(200,150,10,0.35), 0 1px 0 rgba(255,220,80,0.5) inset;
        }
        .btn-gold:hover {
          background-position: 100% 0;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 48px rgba(200,150,10,0.55), 0 1px 0 rgba(255,220,80,0.5) inset;
        }

        .btn-ghost {
          background: rgba(200,160,50,0.05);
          border: 1px solid rgba(200,160,50,0.35);
          color: #c9900a;
          font-weight: 500;
          letter-spacing: 0.03em;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .dark .btn-ghost {
          background: rgba(255,255,255,0.05);
          color: #e0d0a8;
        }

        .btn-ghost:hover {
          background: rgba(200,160,50,0.12);
          border-color: rgba(200,160,50,0.6);
          color: #b8860b;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(200,150,10,0.2);
        }

        .icon-box {
          background: radial-gradient(circle at 30% 30%, rgba(200,160,40,0.2) 0%, rgba(180,140,60,0.06) 100%);
          border: 1px solid rgba(180,140,60,0.28);
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}
