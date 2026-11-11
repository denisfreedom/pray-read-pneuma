'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, CheckCircle2, Clock, ArrowRight, PlayCircle, Search } from 'lucide-react';
import { useThemeStore } from '@/lib/theme-store';

interface ReadingPlan {
  id: number;
  title: string;
  description: string;
  duration_days: number;
  icon: string;
  day_count: number;
  first_book: string | null;
  // Optional — used if your API already returns per-user progress
  enrolled?: boolean;
  completed_days?: number;
  current_day?: number;
  completed?: boolean;
}

interface PlanProgress {
  completed_days: number;
  current_day: number;
  completed: boolean;
}

type DurationFilter = 'all' | 'short' | 'medium' | 'long' | 'year';
type SortOrder = 'shortest' | 'longest' | 'az';

export default function ReadingPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, PlanProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('shortest');
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchPlans();
    fetchProgress();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch('/api/reading-plans');
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data.plans || []);
      setError(false);
    } catch (err) {
      console.error('Error fetching reading plans:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Best-effort: if your API has a progress endpoint, use it.
  // If it 404s (endpoint doesn't exist yet), badges just stay hidden —
  // the page still works. Plans that already carry progress fields
  // (enrolled / completed_days) are used directly, no endpoint needed.
  async function fetchProgress() {
    try {
      const res = await fetch('/api/reading-plans/progress');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<number, PlanProgress> = {};
      const list = data.progress || data.plans || [];
      for (const p of list) {
        if (p.plan_id != null || p.id != null) {
          map[p.plan_id ?? p.id] = {
            completed_days: p.completed_days ?? 0,
            current_day: p.current_day ?? (p.completed_days ?? 0) + 1,
            completed: !!p.completed,
          };
        }
      }
      setProgressMap(map);
    } catch {
      // No progress endpoint yet — not an error, just no badges.
    }
  }

  function getProgress(plan: ReadingPlan): PlanProgress | null {
    // 1. Progress fields baked into the plan object win
    if (plan.completed || plan.enrolled || plan.completed_days != null) {
      return {
        completed_days: plan.completed_days ?? 0,
        current_day: plan.current_day ?? (plan.completed_days ?? 0) + 1,
        completed: !!plan.completed,
      };
    }
    // 2. Otherwise use the progress-endpoint map
    return progressMap[plan.id] ?? null;
  }

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = plans.filter((plan) => {
      if (q && !`${plan.title} ${plan.description} ${plan.first_book ?? ''}`.toLowerCase().includes(q)) {
        return false;
      }
      const d = plan.duration_days;
      if (durationFilter === 'short') return d <= 90;
      if (durationFilter === 'medium') return d > 90 && d <= 180;
      if (durationFilter === 'long') return d > 180 && d < 365;
      if (durationFilter === 'year') return d >= 365;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'longest') return b.duration_days - a.duration_days;
      if (sortOrder === 'az') return a.title.localeCompare(b.title);
      return a.duration_days - b.duration_days;
    });
  }, [plans, search, durationFilter, sortOrder]);

  const inProgressCount = plans.filter((p) => {
    const prog = getProgress(p);
    return prog && !prog.completed;
  }).length;

  const openPlan = (id: number) => router.push(`/reading-plans/${id}`);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-[#06090f] via-[#0a0e17] to-[#08060e]' : 'bg-[#FDFBF6]'}`}>
      {/* Header */}
      <header className={`glass-nav border-b ${isDark ? 'border-[rgba(180,140,60,0.15)]' : 'border-[#E8B84B]/30'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 group">
            <BookOpen className="w-8 h-8 text-[#f0c060]" />
            <span className={`font-serif text-xl font-semibold ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
              Reading Plans
            </span>
          </button>
          <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl text-sm btn-ghost">
            ← Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-6"
            style={{ background: 'rgba(180,130,10,0.15)', border: '1px solid rgba(200,160,40,0.35)' }}>
            <Calendar className="w-4 h-4 text-[#f0c060]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#f0c060]">
              Systematic Bible Reading
            </span>
          </div>

          <h1 className={`font-serif text-5xl md:text-6xl mb-6 ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
            Reading <span className="gold-shimmer">Plans</span>
          </h1>

          <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}`}>
            Choose a structured reading plan to journey through Scripture systematically. From intensive 90-day challenges to gentle year-long plans, find the rhythm that works for you.
          </p>

          {inProgressCount > 0 && (
            <p className="mt-4 inline-block text-xs font-semibold text-[#1B2340] bg-[#F3E9CF] border border-[#E8B84B]/50 rounded-full px-4 py-1.5">
              You have {inProgressCount} plan{inProgressCount > 1 ? 's' : ''} in progress — keep going!
            </p>
          )}

          <div className="divider w-28 mx-auto mt-8" />
        </div>

        {/* Search + Filters */}
        {!loading && !error && plans.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 max-w-3xl mx-auto mb-10">
            <div className={`flex items-center gap-2 flex-1 px-4 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-[rgba(180,140,60,0.25)]' : 'bg-white border-[#E8B84B]/30'}`}>
              <Search className="w-4 h-4 text-[#B98A2F] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans… e.g. Psalms, New Testament"
                className={`w-full bg-transparent outline-none text-sm ${isDark ? 'text-[#f5ece0] placeholder:text-[rgba(220,200,155,0.45)]' : 'text-[#1B2340] placeholder:text-[#9A927E]'}`}
              />
            </div>
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value as DurationFilter)}
              className={`px-4 py-3 rounded-2xl border text-sm font-semibold outline-none cursor-pointer ${isDark ? 'bg-[#0a0e17] text-[#f5ece0] border-[rgba(180,140,60,0.25)]' : 'bg-white text-[#1B2340] border-[#E8B84B]/30'}`}
            >
              <option value="all">All lengths</option>
              <option value="short">Up to 90 days</option>
              <option value="medium">91 – 180 days</option>
              <option value="long">181 – 364 days</option>
              <option value="year">365 days +</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className={`px-4 py-3 rounded-2xl border text-sm font-semibold outline-none cursor-pointer ${isDark ? 'bg-[#0a0e17] text-[#f5ece0] border-[rgba(180,140,60,0.25)]' : 'bg-white text-[#1B2340] border-[#E8B84B]/30'}`}
            >
              <option value="shortest">Shortest first</option>
              <option value="longest">Longest first</option>
              <option value="az">Name A – Z</option>
            </select>
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl p-8 animate-pulse border border-[rgba(180,140,60,0.18)]">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(180,140,60,0.15)] mb-6" />
                <div className="h-6 rounded bg-[rgba(180,140,60,0.15)] mb-3 w-3/4" />
                <div className="h-4 rounded bg-[rgba(180,140,60,0.1)] mb-2" />
                <div className="h-4 rounded bg-[rgba(180,140,60,0.1)] w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-[rgba(180,140,60,0.4)]" />
            <h3 className={`font-serif text-2xl mb-2 ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
              Couldn’t Load Reading Plans
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-[rgba(220,200,155,0.5)]' : 'text-[#6B6455]'}`}>
              The plans are probably still there — the connection just failed. Try again.
            </p>
            <button
              onClick={() => { setLoading(true); setError(false); fetchPlans(); }}
              className="px-8 py-3 rounded-2xl text-sm btn-gold"
            >
              Try Again
            </button>
          </div>
        ) : filteredPlans.length === 0 && plans.length > 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-4 text-[rgba(180,140,60,0.4)]" />
            <h3 className={`font-serif text-2xl mb-2 ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
              No Plans Match Your Search
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-[rgba(220,200,155,0.5)]' : 'text-[#6B6455]'}`}>
              Try a different keyword or a different length.
            </p>
            <button
              onClick={() => { setSearch(''); setDurationFilter('all'); }}
              className="px-8 py-3 rounded-2xl text-sm btn-gold"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlans.map((plan) => {
              const prog = getProgress(plan);
              const total = plan.day_count > 0 ? plan.day_count : plan.duration_days;
              const pct = prog ? Math.min(100, Math.round((prog.completed_days / Math.max(total, 1)) * 100)) : 0;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => openPlan(plan.id)}
                  aria-label={`${prog?.completed ? 'Review' : prog ? 'Continue' : 'Start'} ${plan.title} reading plan`}
                  className="card-glow rounded-3xl p-8 group cursor-pointer relative overflow-hidden text-left w-full"
                >
                  {/* Status badge — only shown when the user REALLY has progress */}
                  {prog?.completed ? (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text- font-bold uppercase tracking-wider text-green-400">Completed</span>
                    </div>
                  ) : prog ? (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(200,160,50,0.14)', border: '1px solid rgba(200,160,40,0.4)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f0c060] animate-pulse" />
                      <span className="text- font-bold uppercase tracking-wider text-[#f0c060]">
                        Day {prog.current_day} of {total}
                      </span>
                    </div>
                  ) : null}

                  {/* Icon */}
                  <div className="flex items-start justify-between mb-6 pr-20">
                    <div className="icon-box w-16 h-16 rounded-2xl flex items-center justify-center text-3xl float-anim">
                      {plan.icon || <BookOpen className="w-8 h-8 text-[#f0c060]" />}
                    </div>
                  </div>

                  {/* Title — theme-aware colour now, readable in light mode too */}
                  <h3 className={`font-serif text-2xl font-semibold mb-3 ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>
                    {plan.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed mb-5 ${isDark ? 'text-[rgba(220,200,155,0.6)]' : 'text-[#6B6455]'}`}>
                    {plan.description}
                  </p>

                  {/* Progress bar — only for plans in progress */}
                  {prog && !prog.completed && (
                    <div className="mb-5">
                      <div className="flex justify-between text- font-semibold mb-1.5">
                        <span className="text-[#B98A2F]">{prog.completed_days} days done</span>
                        <span className={isDark ? 'text-[rgba(220,200,155,0.6)]' : 'text-[#9A927E]'}>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[rgba(180,140,60,0.15)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#c9900a] to-[#f0c060] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mb-6 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#f0c060]" />
                      <span className={isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}>
                        {plan.duration_days} days
                      </span>
                    </div>
                    {plan.day_count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#f0c060]" />
                        <span className={isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}>
                          {plan.day_count} readings
                        </span>
                      </div>
                    )}
                    {plan.first_book && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#f0c060]" />
                        <span className={isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}>
                          Starts in {plan.first_book}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#c9900a] group-hover:translate-x-1 transition-transform">
                    <PlayCircle className="w-4 h-4" />
                    {prog?.completed ? 'Review Plan' : prog ? `Continue · Day ${prog.current_day}` : 'Start Plan'}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty State — only when the library is genuinely empty */}
        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-[rgba(180,140,60,0.3)]" />
            <h3 className={`font-serif text-2xl mb-2 ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
              No Reading Plans Available
            </h3>
            <p className={`text-sm ${isDark ? 'text-[rgba(220,200,155,0.5)]' : 'text-[#6B6455]'}`}>
              Check back soon for new reading plans.
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl p-8 md:p-12"
            style={{ background: 'linear-gradient(135deg, rgba(200,160,50,0.04) 0%, rgba(180,140,60,0.07) 100%)', border: '1px solid rgba(180,140,60,0.18)' }}>
            <div className="flex items-start gap-4 mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#f0c060] flex-shrink-0 mt-1" />
              <div>
                <h3 className={`font-serif text-2xl font-semibold mb-3 ${isDark ? 'text-[#f0d890]' : 'text-[#1B2340]'}`}>
                  Why Follow a Reading Plan?
                </h3>
                <div className={`space-y-3 text-sm leading-relaxed ${isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}`}>
                  <p>
                    <strong className="text-[#B98A2F]">Consistency:</strong> Build a daily habit of reading Scripture with a structured approach.
                  </p>
                  <p>
                    <strong className="text-[#B98A2F]">Completion:</strong> Experience the satisfaction of completing the entire Bible or specific sections.
                  </p>
                  <p>
                    <strong className="text-[#B98A2F]">Context:</strong> Understand the Bible's narrative flow by reading books in sequence.
                  </p>
                  <p>
                    <strong className="text-[#B98A2F]">Community:</strong> Join others following the same plan and grow together in faith.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`font-serif text-3xl md:text-4xl mb-5 ${isDark ? 'text-[#f5ece0]' : 'text-[#1B2340]'}`}>
            Ready to Start Your Journey?
          </h2>
          <p className={`text-base mb-8 leading-relaxed ${isDark ? 'text-[rgba(220,200,155,0.65)]' : 'text-[#6B6455]'}`}>
            Choose a reading plan above and begin your systematic journey through the Word of God today.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-10 py-4 rounded-2xl text-sm btn-gold inline-flex items-center gap-3"
          >
            <BookOpen className="w-5 h-5" />
            Choose a Plan
          </button>
        </div>
      </section>

      <style jsx global>{`
        .glass-nav {
          background: ${isDark ? 'rgba(6,9,15,0.82)' : 'rgba(255, 255, 255, 0.9)'};
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
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
          background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(200,160,50,0.05)'};
          border: 1px solid rgba(200,160,50,0.35);
          color: ${isDark ? '#e0d0a8' : '#c9900a'};
          font-weight: 500;
          letter-spacing: 0.03em;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .btn-ghost:hover {
          background: rgba(200,160,50,0.12);
          border-color: rgba(200,160,50,0.6);
          color: #b8860b;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(200,150,10,0.2);
        }

        .card-glow {
          background: ${isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(180,140,60,0.07) 100%)' : 'linear-gradient(135deg, rgba(253,251,246,1) 0%, rgba(243,233,207,0.6) 100%)'};
          border: 1px solid rgba(180,140,60,0.18);
          transition: all 0.4s cubic-bezier(.16,1,.3,1);
        }

        .card-glow:hover {
          background: ${isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(180,140,60,0.14) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(243,233,207,0.9) 100%)'};
          border-color: rgba(180,140,60,0.4);
          transform: translateY(-8px);
          box-shadow: ${isDark ? '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(180,140,60,0.2)' : '0 32px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(180,140,60,0.2)'};
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(180,140,60,0.45), transparent);
        }

        .gold-shimmer {
          background: linear-gradient(90deg, #b8860b, #f0c060, #fff8e0, #e8b840, #c9a030, #f0c060, #b8860b);
          background-size: 400% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 7s linear infinite;
        }

        @keyframes shimmer {
          0%   { background-position: -400% center; }
          100% { background-position:  400% center; }
        }

        .float-anim {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-12px) rotate(1deg); }
        }

        .icon-box {
          background: radial-gradient(circle at 30% 30%, rgba(200,160,40,0.2) 0%, rgba(180,140,60,0.06) 100%);
          border: 1px solid rgba(180,140,60,0.28);
          transition: all 0.3s ease;
        }
        .icon-box:hover {
          background: radial-gradient(circle at 30% 30%, rgba(200,160,40,0.3) 0%, rgba(180,140,60,0.12) 100%);
          border-color: rgba(180,140,60,0.55);
          box-shadow: 0 0 24px rgba(200,150,10,0.2);
        }
      `}</style>
    </div>
  );
}
