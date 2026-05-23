'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, CheckCircle2, Clock, ArrowRight, PlayCircle, Users } from 'lucide-react';
import { useThemeStore } from '@/lib/theme-store';

interface ReadingPlan {
  id: number;
  title: string;
  description: string;
  duration_days: number;
  icon: string;
  day_count: number;
  first_book: string | null;
}

export default function ReadingPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch('/api/reading-plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching reading plans:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-[#06090f] via-[#0a0e17] to-[#08060e]' : 'bg-gradient-to-br from-white via-gray-50 to-white'}`}>
      {/* Header */}
      <header className={`glass-nav border-b ${theme === 'dark' ? 'border-[rgba(180,140,60,0.15)]' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 group"
          >
            <BookOpen className="w-8 h-8 text-[#f0c060]" />
            <span className={`font-serif text-xl font-semibold ${theme === 'dark' ? 'text-[#f5ece0]' : 'text-gray-900'}`}>
              Reading Plans
            </span>
          </button>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-sm btn-ghost"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-6"
            style={{ background: 'rgba(180,130,10,0.15)', border: '1px solid rgba(200,160,40,0.35)' }}>
            <Calendar className="w-4 h-4 text-[#f0c060]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#f0c060]">
              Systematic Bible Reading
            </span>
          </div>

          <h1 className={`font-serif text-5xl md:text-6xl mb-6 ${theme === 'dark' ? 'text-[#f5ece0]' : 'text-gray-900'}`}>
            Reading <span className="gold-shimmer">Plans</span>
          </h1>

          <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-[rgba(220,200,155,0.65)]' : 'text-gray-600'}`}>
            Choose a structured reading plan to journey through Scripture systematically. From intensive 90-day challenges to gentle year-long plans, find the rhythm that works for you.
          </p>

          <div className="divider w-28 mx-auto mt-8" />
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-[rgba(180,140,60,0.2)] border-t-[#f0c060] rounded-full animate-spin" />
            <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-[rgba(220,200,155,0.5)]' : 'text-gray-500'}`}>Loading reading plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="card-glow rounded-3xl p-8 group cursor-pointer relative overflow-hidden"
                onClick={() => router.push(`/reading-plans/${plan.id}`)}
              >
                {/* Active status badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Active</span>
                </div>

                {/* Icon & Duration Badge */}
                <div className="flex items-start justify-between mb-6 pr-20">
                  <div className="icon-box w-16 h-16 rounded-2xl flex items-center justify-center text-3xl float-anim">
                    {plan.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-serif text-2xl font-semibold mb-3 text-[#f0d890]">
                  {plan.title}
                </h3>

                {/* Description */}
                <p className={`text-sm leading-relaxed mb-5 ${theme === 'dark' ? 'text-[rgba(220,200,155,0.6)]' : 'text-gray-600'}`}>
                  {plan.description}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-4 mb-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#f0c060]" />
                    <span className={theme === 'dark' ? 'text-[rgba(220,200,155,0.65)]' : 'text-gray-500'}>
                      {plan.duration_days} days
                    </span>
                  </div>
                  {plan.day_count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#f0c060]" />
                      <span className={theme === 'dark' ? 'text-[rgba(220,200,155,0.65)]' : 'text-gray-500'}>
                        {plan.day_count} readings
                      </span>
                    </div>
                  )}
                  {plan.first_book && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#f0c060]" />
                      <span className={theme === 'dark' ? 'text-[rgba(220,200,155,0.65)]' : 'text-gray-500'}>
                        Starts in {plan.first_book}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#c9900a] group-hover:translate-x-1 transition-transform">
                    <PlayCircle className="w-4 h-4" />
                    Start Plan
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && plans.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-[rgba(180,140,60,0.3)]" />
            <h3 className={`font-serif text-2xl mb-2 ${theme === 'dark' ? 'text-[#f5ece0]' : 'text-gray-900'}`}>
              No Reading Plans Available
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-[rgba(220,200,155,0.5)]' : 'text-gray-500'}`}>
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
                <h3 className="font-serif text-2xl font-semibold mb-3 text-[#f0d890]">
                  Why Follow a Reading Plan?
                </h3>
                <div className={`space-y-3 text-sm leading-relaxed ${theme === 'dark' ? 'text-[rgba(220,200,155,0.65)]' : 'text-gray-600'}`}>
                  <p>
                    <strong className="text-[#f0c060]">Consistency:</strong> Build a daily habit of reading Scripture with a structured approach.
                  </p>
                  <p>
                    <strong className="text-[#f0c060]">Completion:</strong> Experience the satisfaction of completing the entire Bible or specific sections.
                  </p>
                  <p>
                    <strong className="text-[#f0c060]">Context:</strong> Understand the Bible's narrative flow by reading books in sequence.
                  </p>
                  <p>
                    <strong className="text-[#f0c060]">Community:</strong> Join others following the same plan and grow together in faith.
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
          <h2 className={`font-serif text-3xl md:text-4xl mb-5 ${theme === 'dark' ? 'text-[#f5ece0]' : 'text-gray-900'}`}>
            Ready to Start Your Journey?
          </h2>
          <p className={`text-base mb-8 leading-relaxed ${theme === 'dark' ? 'text-[rgba(220,200,155,0.65)]' : 'text-gray-600'}`}>
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
          background: ${theme === 'dark' ? 'rgba(6,9,15,0.82)' : 'rgba(255, 255, 255, 0.9)'};
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
          background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(200,160,50,0.05)'};
          border: 1px solid rgba(200,160,50,0.35);
          color: ${theme === 'dark' ? '#e0d0a8' : '#c9900a'};
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
          background: ${theme === 'dark' ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(180,140,60,0.07) 100%)' : 'linear-gradient(135deg, rgba(200,160,50,0.04) 0%, rgba(180,140,60,0.07) 100%)'};
          border: 1px solid rgba(180,140,60,0.18);
          transition: all 0.4s cubic-bezier(.16,1,.3,1);
        }

        .card-glow:hover {
          background: ${theme === 'dark' ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(180,140,60,0.14) 100%)' : 'linear-gradient(135deg, rgba(200,160,50,0.07) 0%, rgba(180,140,60,0.14) 100%)'};
          border-color: rgba(180,140,60,0.4);
          transform: translateY(-8px);
          box-shadow: ${theme === 'dark' ? '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(180,140,60,0.2)' : '0 32px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(180,140,60,0.2)'};
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
