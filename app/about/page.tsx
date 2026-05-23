'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VisitorMap from '../components/VisitorMap';
import AppFooter from '@/app/components/AppFooter';
import AppNavbar from '@/app/components/AppNavbar';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';
const PASTOR_IMG = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1771057981255_fhoims.png';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const stats = [
  { value: '66', label: 'Books of the Bible' },
  { value: '2', label: 'Languages' },
  { value: '1K+', label: 'Daily Readers' },
  { value: '∞', label: 'Grace Available' },
];

const pillars = [
  {
    icon: '🕊️',
    title: 'Encounter',
    desc: 'Every session is a live encounter with Christ as the Living Word, not just a reading exercise.',
  },
  {
    icon: '🌍',
    title: 'Accessibility',
    desc: 'Available offline, on any device, in English and Luganda — reaching every believer everywhere.',
  },
  {
    icon: '🔥',
    title: 'Spirit & Life',
    desc: 'We hold the conviction that the Word of God is Spirit and Life, meant to transform the inner man.',
  },
  {
    icon: '🏛️',
    title: 'Community',
    desc: 'Rooted in the corporate testimony of the Body of Christ, growing together in divine truth.',
  },
];

export default function AboutPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-[#0a0a0f] text-white font-sans antialiased flex flex-col min-h-screen overflow-x-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

        body { background: #0a0a0f; }

        .font-playfair { font-family: 'Playfair Display', Georgia, serif; }
        .font-inter { font-family: 'Inter', sans-serif; }

        .hero-bg {
          background-image: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2670&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
        }

        .gold-text {
          background: linear-gradient(135deg, #c9a84c, #f0d080, #c9a84c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .gold-card {
          background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(240,208,128,0.06));
          border: 1px solid rgba(201,168,76,0.25);
        }

        .glow-gold {
          box-shadow: 0 0 60px rgba(201,168,76,0.18), 0 0 120px rgba(201,168,76,0.08);
        }

        .pillar-card:hover {
          transform: translateY(-6px);
          border-color: rgba(201,168,76,0.4);
          background: rgba(201,168,76,0.08);
        }

        .nav-glass {
          background: rgba(10,10,15,0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .shimmer-line {
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .floating {
          animation: floating 6s ease-in-out infinite;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        .orb1 {
          background: radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 70%);
          animation: pulse-orb 8s ease-in-out infinite;
        }

        .orb2 {
          background: radial-gradient(circle, rgba(120,80,200,0.15) 0%, transparent 70%);
          animation: pulse-orb 10s ease-in-out infinite reverse;
        }

        @keyframes pulse-orb {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .timeline-dot::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          background: #c9a84c;
          border-radius: 50%;
        }

        .stat-num {
          font-family: 'Playfair Display', serif;
          background: linear-gradient(135deg, #c9a84c, #f0d080);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <AppNavbar />

      <main className="flex-grow pt-20">

        {/* ─── HERO ─── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background image with parallax */}
          <div
            className="absolute inset-0 hero-bg"
            style={{ transform: `translateY(${scrollY * 0.3}px)`, scale: '1.1' }}
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/50 to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />

          {/* Animated orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 orb1 rounded-full pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 orb2 rounded-full pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
            <div
              className="inline-block px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
              style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: '#f0d080',
                opacity: 1,
                animation: 'none',
              }}
            >
              ✦ Our Story & Vision ✦
            </div>

            <h1 className="font-playfair text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
              Encountering Christ
              <br />
              <span className="gold-text italic">as Living Word</span>
            </h1>

            <p className="font-inter text-lg md:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed font-light">
              Pray-Read is a digital sanctuary — a Living Altar where the Word of God ceases to be mere text
              and becomes <em className="text-white/90">Spirit and Life</em> in the daily experience of every believer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/bible-reader"
                className="px-8 py-4 rounded-xl text-[#0a0a0f] font-semibold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 glow-gold"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d080)' }}>
                Open the Word →
              </Link>
              <Link href="/community"
                className="px-8 py-4 rounded-xl glass-card text-white font-medium text-sm tracking-wide hover:border-[#c9a84c]/40 transition-all">
                Join Community
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs font-inter" style={{ animation: 'floating 2s ease-in-out infinite' }}>
            <span>Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </section>

        {/* ─── STATS BAR ─── */}
        <section className="relative py-16 border-y border-white/5" style={{ background: 'rgba(201,168,76,0.04)' }}>
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((s, i) => (
                <div key={i} className="space-y-2">
                  <div className="stat-num text-4xl md:text-5xl font-bold font-playfair">{s.value}</div>
                  <div className="font-inter text-xs uppercase tracking-widest text-white/40">{s.label}</div>
                </div>
              ))}
            </AnimatedSection>
          </div>
        </section>

        {/* ─── SCRIPTURE BANNER ─── */}
        <AnimatedSection>
          <section className="relative py-24 px-6 overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2670&auto=format&fit=crop"
                alt="starry sky"
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
            </div>
            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
              <div className="w-16 h-px mx-auto shimmer-line" />
              <blockquote className="font-playfair text-2xl md:text-4xl italic text-white/90 leading-relaxed">
                "That I may know him, and the power of his resurrection, and the fellowship of his sufferings."
              </blockquote>
              <cite className="font-inter text-sm text-[#c9a84c] not-italic tracking-widest uppercase">— Philippians 3:10</cite>
              <div className="w-16 h-px mx-auto shimmer-line" />
            </div>
          </section>
        </AnimatedSection>

        {/* ─── FOUR PILLARS ─── */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection className="text-center mb-16 space-y-4">
              <p className="font-inter text-xs uppercase tracking-widest text-[#c9a84c]">What Drives Us</p>
              <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white">Four Pillars of the Ministry</h2>
            </AnimatedSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pillars.map((p, i) => (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="pillar-card glass-card rounded-2xl p-8 text-center space-y-4 transition-all duration-500 cursor-default h-full">
                    <div className="text-4xl floating" style={{ animationDelay: `${i * 0.5}s` }}>{p.icon}</div>
                    <h3 className="font-playfair text-xl font-bold gold-text">{p.title}</h3>
                    <p className="font-inter text-sm text-white/55 leading-relaxed">{p.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHY PRAY-READ ─── */}
        <section className="py-24 px-6" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.03), transparent)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Left: Image */}
              <AnimatedSection>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl glow-gold">
                  <img
                    src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?q=80&w=2670&auto=format&fit=crop"
                    alt="Open Bible"
                    className="w-full h-[480px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="glass-card rounded-xl p-5">
                      <p className="font-playfair text-lg italic text-white/90">"The Word was given to be Spirit and Life."</p>
                      <p className="font-inter text-xs text-[#c9a84c] mt-2 uppercase tracking-widest">John 6:63</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Right: Text */}
              <AnimatedSection delay={200} className="space-y-8">
                <div className="space-y-4">
                  <p className="font-inter text-xs uppercase tracking-widest text-[#c9a84c]">The Name Explained</p>
                  <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white leading-tight">
                    Why <span className="gold-text">"Pray-Read"</span>?
                  </h2>
                  <div className="w-16 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #c9a84c, #f0d080)' }} />
                </div>

                <p className="font-inter text-white/60 leading-relaxed text-[15px]">
                  "Pray-Read" is not just a method — it is a recovery. The Bible was not given merely to be analyzed
                  or debated academically. It was given to be taken in as life. Pray-reading joins two actions
                  that should never be separated: <span className="text-white/90 font-medium">reading the Word</span> and <span className="text-white/90 font-medium">praying the Word</span>.
                </p>

                <div className="space-y-4">
                  {[
                    'Accessibility for everyone, everywhere.',
                    'Cultural relevance through local language translation.',
                    'Technological simplicity for distraction-free devotion.',
                    'Spirit-led reading that transforms the inner man.',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}>✓</div>
                      <span className="font-inter text-sm text-white/65">{item}</span>
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ─── TECHNOLOGY ─── */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Left: Text */}
              <AnimatedSection className="space-y-8">
                <div className="space-y-4">
                  <p className="font-inter text-xs uppercase tracking-widest text-[#c9a84c]">Built for the Modern Believer</p>
                  <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white leading-tight">
                    Modern Technology,<br /><span className="gold-text italic">Timeless Truth.</span>
                  </h2>
                  <div className="w-16 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #c9a84c, #f0d080)' }} />
                </div>
                <p className="font-inter text-white/60 leading-relaxed text-[15px]">
                  We utilize cutting-edge web capabilities to ensure a fast, responsive, and installable
                  experience on any device — mobile, tablet, or desktop — without the need for an app store.
                </p>

                <div className="space-y-4">
                  <div className="gold-card rounded-2xl p-6 space-y-2">
                    <h4 className="font-inter font-semibold text-white flex items-center gap-3">
                      <span className="text-xl">📡</span> Offline First (PWA)
                    </h4>
                    <p className="font-inter text-sm text-white/55 leading-relaxed">
                      Built as a Progressive Web App, scripture is stored on your device. The Word stays with you
                      wherever you go — even without internet.
                    </p>
                  </div>
                  <div className="gold-card rounded-2xl p-6 space-y-2">
                    <h4 className="font-inter font-semibold text-white flex items-center gap-3">
                      <span className="text-xl">🌐</span> Dual Language
                    </h4>
                    <p className="font-inter text-sm text-white/55 leading-relaxed">
                      Switch instantly between English (KJV) and Luganda. The gospel speaks to your heart
                      in the language you understand best.
                    </p>
                  </div>
                </div>
              </AnimatedSection>

              {/* Right: Image */}
              <AnimatedSection delay={200}>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2673&auto=format&fit=crop"
                    alt="Digital and nature"
                    className="w-full h-[480px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/70 via-transparent to-transparent" />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ─── PASTOR / DEVELOPER ─── */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2644&auto=format&fit=crop"
              alt="city lights"
              className="w-full h-full object-cover opacity-8"
              style={{ opacity: 0.06 }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0a0f, rgba(201,168,76,0.04), #0a0a0f)' }} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <AnimatedSection className="text-center mb-16 space-y-4">
              <p className="font-inter text-xs uppercase tracking-widest text-[#c9a84c]">The Visionary</p>
              <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white">Ministry & Development</h2>
            </AnimatedSection>

            <AnimatedSection delay={150}>
              <div className="glass-card rounded-3xl p-10 md:p-14 relative overflow-hidden">
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20" style={{ background: 'radial-gradient(circle, #c9a84c, transparent)' }} />

                <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="relative w-36 h-36 rounded-full glow-gold overflow-hidden" style={{ border: '3px solid rgba(201,168,76,0.4)' }}>
                      <img src={PASTOR_IMG} alt="Pastor Denis Matovu" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center mt-4">
                      <div className="inline-block px-3 py-1 rounded-full text-xs font-inter uppercase tracking-widest" style={{ background: 'rgba(201,168,76,0.12)', color: '#f0d080', border: '1px solid rgba(201,168,76,0.3)' }}>
                        ✦ Lead Developer
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-grow space-y-6 text-center md:text-left">
                    <div>
                      <h3 className="font-playfair text-3xl font-bold text-white">Pastor Denis Matovu</h3>
                      <p className="font-inter text-sm mt-1" style={{ color: '#c9a84c' }}>Vision Bearer · Pneuma Freedom Experience Ministry · Christ Faculty Hub</p>
                    </div>

                    <p className="font-inter text-[15px] text-white/60 leading-relaxed">
                      Prayerfully developed under the leadership of Pastor Denis Matovu, this platform was born
                      from a burden to see believers experience Christ more deeply. His calling unites revelation
                      and innovation — leveraging technology as a vessel for divine truth, equipping the saints to
                      live out God's eternal purpose practically.
                    </p>

                    <p className="font-inter text-[15px] text-white/60 leading-relaxed">
                      As Founder of the Christ Faculty Hub, he integrates spiritual leadership with technical
                      excellence to build tools that minister Christ, strengthen the Body, and advance the
                      corporate expression of the church.
                    </p>

                    <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                      <a href="https://freedomexperienceministry.org" target="_blank" rel="noopener noreferrer"
                        className="px-6 py-3 glass-card rounded-xl text-sm font-inter text-white/70 hover:text-white hover:border-[#c9a84c]/40 transition-all flex items-center gap-2">
                        🌐 Ministry Website
                      </a>
                      <Link href="/community"
                        className="px-6 py-3 rounded-xl text-sm font-inter text-[#0a0a0f] font-semibold transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d080)' }}>
                        Join the Community →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <AnimatedSection>
          <section className="py-24 px-6 relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2672&auto=format&fit=crop"
                alt="cosmos"
                className="w-full h-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
            </div>
            <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
              <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white">
                Begin Your <span className="gold-text italic">Encounter</span> Today
              </h2>
              <p className="font-inter text-white/55 leading-relaxed">
                Open the Living Word. Pray through every verse. Experience Christ in a way that transforms — not just informs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/bible-reader"
                  className="px-10 py-4 rounded-xl text-[#0a0a0f] font-semibold tracking-wide transition-all hover:scale-105 active:scale-95 glow-gold"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d080)' }}>
                  Read the Bible →
                </Link>
                <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer"
                  className="px-10 py-4 rounded-xl glass-card text-white font-medium tracking-wide hover:border-[#c9a84c]/40 transition-all">
                  ♥ Support the Ministry
                </a>
              </div>
            </div>
          </section>
        </AnimatedSection>

      </main>

      {/* ─── FOOTER ─── */}
      <AppFooter />
    </div>
  );
}
