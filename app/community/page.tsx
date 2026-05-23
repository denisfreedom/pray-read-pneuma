'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import VisitorMap from '../components/VisitorMap';
import AppNavbar from '@/app/components/AppNavbar';
import AppFooter from '@/app/components/AppFooter';
import { BookOpen, Users, Mic, Globe, MessageCircle, Heart } from 'lucide-react';

// Beautiful Unsplash hero: golden sunrise light rays through forest/cathedral atmosphere
const HERO_BG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop';

const stats = [
  { value: '1,200+', label: 'Members Worldwide' },
  { value: '50+',    label: 'Countries Reached' },
  { value: '350+',  label: 'Daily Reflections' },
  { value: '24/7',  label: 'Active Community' },
];

const features = [
  {
    icon: <BookOpen className="w-10 h-10" />,
    title: 'Daily Fellowship',
    desc: 'Engage in daily discussions about scripture, share your pray-reading experiences, and receive encouragement from fellow saints around the globe. Join a group, start a thread, and build lasting connections in the body of Christ.',
    buttonLabel: 'Open Discussion Feed',
    route: '/discussion-groups',
    accent: 'from-amber-400 to-orange-500',
  },
  {
    icon: <Users className="w-10 h-10" />,
    title: 'Share Revelations',
    desc: "Post insights and revelations received during your time in the Word. Learn from others' fresh enlightenment, respond with encouragement, and grow together as a community of believers pursuing the living Christ.",
    buttonLabel: 'Open Insights Feed',
    route: '/community/revelations',
    accent: 'from-violet-400 to-purple-600',
  },
  {
    icon: <Mic className="w-10 h-10" />,
    title: 'Live Teaching',
    desc: 'Join weekly live sessions with Pastor Denis Matovu exploring the depths of Christ and practical, transformative Christian living. View the full schedule and never miss a session.',
    buttonLabel: 'View Live Schedule',
    route: '/community/live-teaching',
    accent: 'from-emerald-400 to-teal-600',
  },
  {
    icon: <BookOpen className="w-10 h-10" />,
    title: 'Pray-Read Together',
    desc: 'Follow guided pray-reading schedules with the community, moving through the Word as one body pursuing the living Christ.',
    buttonLabel: null,
    route: null,
    accent: 'from-amber-400 to-orange-500',
  },
  {
    icon: <Globe className="w-10 h-10" />,
    title: 'Global Reach',
    desc: 'Connect with believers from over 50 nations — all united by one passion: experiencing Christ as life through His Word.',
    buttonLabel: null,
    route: null,
    accent: 'from-amber-400 to-orange-500',
  },
  {
    icon: <MessageCircle className="w-10 h-10" />,
    title: 'Prayer Requests',
    desc: "Share your heart and carry one another's burdens. Our community intercedes together, raising a living altar of prayer.",
    buttonLabel: null,
    route: null,
    accent: 'from-amber-400 to-orange-500',
  },
];

const testimonials = [
  {
    name: 'Sarah M.',
    country: 'Kenya',
    initials: 'SM',
    color: 'from-amber-400 to-orange-500',
    text: '"This community has revolutionized my devotional life. The daily sharing of revelations keeps me fresh and hungry for more of Christ."',
  },
  {
    name: 'David K.',
    country: 'Uganda',
    initials: 'DK',
    color: 'from-violet-400 to-purple-600',
    text: "\"Pastor Denis' weekly teachings have opened my eyes to dimensions of Christ I never knew existed. Truly life-changing.\"",
  },
  {
    name: 'Grace N.',
    country: 'Tanzania',
    initials: 'GN',
    color: 'from-emerald-400 to-teal-600',
    text: "\"Finding believers who are serious about experiencing Christ has been such a blessing. I'm no longer alone in this pursuit.\"",
  },
];

const goldGradient: React.CSSProperties = {
  backgroundImage: 'linear-gradient(135deg, #f5d790, #e8a428)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const heroTitleGradient: React.CSSProperties = {
  backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f5d790 40%, #e8a428 70%, #ffffff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function CommunityPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [visibleStats, setVisibleStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleStats(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#0d0d0d] text-white font-sans antialiased flex flex-col min-h-screen overflow-x-hidden">

      <AppNavbar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Beautiful mountain sunrise background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        {/* Warm golden overlay to enhance the spiritual feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-amber-950/20 to-[#0d0d0d]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        {/* Subtle warm tint layer */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(180,100,20,0.12) 0%, transparent 60%)' }} />

        {/* Floating glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto space-y-8 mt-20">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm font-medium backdrop-blur-sm">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            Community · Now Live
          </div>

          <h1
            className="font-serif text-6xl md:text-8xl font-bold leading-tight"
            style={heroTitleGradient}
          >
            One Body.<br />
            <span className="italic font-light">One Word.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Join thousands of believers from across the globe who are pursuing a deeper, living experience of Christ through the pray-reading of His Word.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 rounded-full font-semibold text-base bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90 transition-all shadow-2xl shadow-amber-500/30 active:scale-95"
            >
              Join the Community →
            </button>
            <button
              onClick={() => router.push('/user-login')}
              className="px-8 py-4 rounded-full font-medium text-base border border-white/20 text-white hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs tracking-widest uppercase z-10">
          <span>Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        ref={statsRef}
        className="relative py-20 px-6"
        style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #111108 100%)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div
                key={i}
                className="text-center p-8 rounded-2xl border border-white/5 hover:border-amber-400/20 transition-all duration-500 group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  opacity: visibleStats ? 1 : 0,
                  transform: visibleStats ? 'translateY(0)' : 'translateY(30px)',
                  transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s, border-color 0.3s`,
                }}
              >
                <div
                  className="text-4xl md:text-5xl font-bold font-display mb-2 group-hover:scale-105 transition-transform"
                  style={goldGradient}
                >
                  {s.value}
                </div>
                <div className="text-white/40 text-xs uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VERSE-SONGS SPOTLIGHT ── */}
      <section className="py-20 px-6" style={{ background: '#0a0a0a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 space-y-4">
            <p className="text-amber-400 text-sm uppercase tracking-widest font-medium">Worship Through Scripture</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">
              Experience Bible Verses as Music
            </h2>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
              Beautiful worship songs that transform God's Word into powerful musical experiences.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Link href="/verse-songs">
              <button className="px-8 py-4 rounded-full font-semibold text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-all shadow-2xl shadow-purple-500/30 active:scale-95">
                Explore Verse-Songs ♪
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHAT WE OFFER ── */}
      <section className="py-24 px-6" style={{ background: '#0a0a0a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <p className="text-amber-400 text-sm uppercase tracking-widest font-medium">What We Offer</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-white">
              Life Together in the Word
            </h2>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
              Everything you need to grow, connect, and experience Christ alongside a global family.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl border border-white/5 hover:border-amber-400/25 transition-all duration-400 relative overflow-hidden flex flex-col"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-amber-400/0 group-hover:from-amber-400/5 group-hover:to-transparent transition-all duration-500 rounded-2xl" />

                <div className="relative z-10 flex flex-col flex-grow">
                  <div className="text-amber-400 mb-5">{f.icon}</div>
                  <h3 className="font-display text-lg font-bold text-white mb-3 group-hover:text-amber-300 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-white/50 leading-relaxed text-sm flex-grow">{f.desc}</p>
                  {f.buttonLabel && f.route && (
                    <button
                      onClick={() => router.push(f.route!)}
                      className={`mt-6 w-full py-3 rounded-xl text-sm font-semibold text-black bg-gradient-to-r ${f.accent} hover:opacity-90 transition-all active:scale-95 shadow-lg`}
                    >
                      {f.buttonLabel} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: '#0d0d0d' }}>
        {/* Ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-4">
            <p className="text-amber-400 text-sm uppercase tracking-widest font-medium">Testimonies</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-white">
              Community Voices
            </h2>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
              Hear from members who have been transformed through fellowship and the living Word.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl border border-white/5 relative flex flex-col gap-6"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                {/* Quote mark */}
                <div className="text-6xl text-amber-400/20 font-serif leading-none select-none">&ldquo;</div>

                <p className="text-white/70 leading-relaxed text-sm flex-grow -mt-8">{t.text}</p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.country}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: '#0a0a0a' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
          <div
            className="inline-flex w-20 h-20 rounded-2xl items-center justify-center text-4xl mx-auto"
            style={{ background: 'linear-gradient(135deg, rgba(245,215,144,0.15), rgba(232,164,40,0.15))', border: '1px solid rgba(245,215,144,0.2)' }}
          >
            ✝️
          </div>

          <h2 className="font-serif text-5xl md:text-6xl font-bold text-white leading-tight">
            Ready to join<br />
            <span className="italic font-light" style={goldGradient}>
              the family?
            </span>
          </h2>

          <p className="text-white/60 text-lg leading-relaxed max-w-xl mx-auto">
            Create your free account today and become part of a global community pursuing the deep things of Christ through His living Word.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="px-10 py-4 rounded-full font-semibold text-base bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90 transition-all shadow-2xl shadow-amber-500/25 active:scale-95"
            >
              Create Free Account
            </button>
            <button
              onClick={() => router.push('/user-login')}
              className="px-10 py-4 rounded-full font-medium text-base border border-white/15 text-white hover:bg-white/10 transition-all"
            >
              Already a member? Sign In
            </button>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
