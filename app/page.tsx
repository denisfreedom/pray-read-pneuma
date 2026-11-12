"use client";

import { motion } from 'framer-motion';
import { BookOpen, Users, Heart, Sparkles, ArrowRight, Calendar, FileText, Clock, Lightbulb, MessageCircle as MessageCircleIcon, Music, Download, Smartphone, Mic, Link2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import VerseOfTheDayModal from '@/components/VerseOfTheDayModal';
import AuthProtectedLink from '@/components/AuthProtectedLink';
import OfflineManager from '@/components/OfflineManager';
import AppFooter from '@/app/components/AppFooter';
import RecommendedForYou from '@/app/components/RecommendedForYou';
import SessionTracker from '@/app/components/SessionTracker';
import ContentNotificationBell from '@/app/components/ContentNotificationBell';

// app/page.tsx (Home) — FIXED
// 1) Logo: CDN -> local /assets/PrayRead-logo.png (public/assets/PrayRead-logo.png)
// 2) Install banner: blue/purple -> navy/gold + REAL install (uses window.__pwaDeferredPrompt if present,
//    else opens the InstallPrompt via custom event, else falls back to /install-prompt page)
// 3) Dead "#" links fixed -> all 12 feature cards now point to REAL routes
// 4) Dead imports removed (Search, Bookmark, Flame, Grid, BookMarked, HelpCircle, LinkIcon)
// 5) No more <button> inside <Link>/<a> — Link itself is styled as the button
// 6) Particles: deltas stored once, no Math.random() inside animate
// 7) Devotional section: purple/pink -> navy/gold
// 8) No InstallPWA / InstallPrompt here — that lives ONCE in app/layout.tsx. Home only triggers it.

const LOGO = '/assets/PrayRead-logo.png';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

const getFeatureIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    messageCircle: <MessageCircleIcon className="w-6 h-6 text-amber-400" />,
    bookOpen: <BookOpen className="w-6 h-6 text-amber-400" />,
    music: <Music className="w-6 h-6 text-amber-400" />,
    heart: <Heart className="w-6 h-6 text-amber-400" />,
    sparkles: <Sparkles className="w-6 h-6 text-amber-400" />,
    clock: <Clock className="w-6 h-6 text-amber-400" />,
    users: <Users className="w-6 h-6 text-amber-400" />,
    lightbulb: <Lightbulb className="w-6 h-6 text-amber-400" />,
    mic: <Mic className="w-6 h-6 text-amber-400" />,
    fileText: <FileText className="w-6 h-6 text-amber-400" />,
    link2: <Link2 className="w-6 h-6 text-amber-400" />,
  };
  return icons[iconName] || <BookOpen className="w-6 h-6 text-amber-400" />;
};

export default function Home() {
  const [particles, setParticles] = useState<Array<{ x: number; y: number; scale: number; dx: number; dy: number; dur: number }>>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'installed' | 'no-prompt'>('idle');

  useEffect(() => {
    setIsMounted(true);
    const email = localStorage.getItem('userEmail');
    setUserEmail(email || undefined);
    const width = window.innerWidth || 800;
    const height = window.innerHeight || 600;
    // Deltas + duration computed ONCE, not Math.random() inside animate
    setParticles([...Array(20)].map(() => ({
      x: Math.random() * width, y: Math.random() * height,
      scale: Math.random() * 0.5 + 0.5,
      dx: Math.random() * 200 - 100, dy: Math.random() * 200 - 100,
      dur: Math.random() * 10 + 10,
    })));
    if (window.matchMedia('(display-mode: standalone)').matches) setInstallState('installed');
  }, []);

  // REAL install from the Home banner — tries the real browser prompt first
  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const deferred: any = (window as any).__pwaDeferredPrompt;
    if (deferred) {
      setInstallState('installing');
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === 'accepted') setInstallState('installed');
        else setInstallState('idle');
      } catch { setInstallState('no-prompt'); }
      return;
    }
    // No prompt captured yet (e.g. iOS) -> ask the layout-level InstallPrompt to open
    window.dispatchEvent(new CustomEvent('prb-open-install'));
    // If layout has no InstallPrompt listening, fall back to the install page after a beat
    setTimeout(() => { if (installState === 'idle') window.location.href = '/install-prompt'; }, 600);
  };

  return (
    <>
      <SessionTracker />
      <VerseOfTheDayModal />
      <OfflineManager />
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90"></div>
        </div>

        <div className="fixed inset-0 z-0 pointer-events-none">
          {isMounted && particles.map((p, i) => (
            <motion.div key={i} className="absolute w-1 h-1 bg-amber-300/30 rounded-full"
              initial={{ x: p.x, y: p.y, scale: p.scale }}
              animate={{ y: [null, p.y + p.dy], x: [null, p.x + p.dx], opacity: [0.2, 0.5, 0.2], scale: [0.5, 1, 0.5] }}
              transition={{ duration: p.dur, repeat: Infinity, ease: 'linear' }} />
          ))}
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Navigation — FIXED: no <button> inside <Link>, local logo */}
          <nav className="w-full px-3 sm:px-6 lg:px-8 pt-4 pb-3 sm:pt-6 sm:pb-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <motion.div className="flex items-center gap-2 sm:gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <Link href="/" className="flex items-center gap-2 sm:gap-3">
                  <span className="w-10 h-10 sm:w-12 sm:h-12 relative flex items-center justify-center rounded-2xl overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E7C873' }}>
                    <Image src={logoSrc} alt="Pray-Read Bible Logo" width={48} height={48} className="object-contain drop-shadow-lg"
                      onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
                  </span>
                  <span className="hidden sm:inline text-base sm:text-lg font-bold text-white">Pray-Read <span className="text-[#E7C873]">Bible</span></span>
                </Link>
              </motion.div>
              <motion.div className="flex items-center gap-1.5 sm:gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                <ContentNotificationBell userEmail={userEmail} />
                <Link href="/about" className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white hover:text-amber-300 transition-all font-medium">About</Link>
                <Link href="/community" className="hidden sm:block px-3 py-2 text-sm text-white hover:text-amber-300 transition-all font-medium">Community</Link>
                <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer"
                  className="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-md font-medium flex items-center gap-1.5 whitespace-nowrap">
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4" /> Donate
                </a>
                <Link href="/signup" className="px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-semibold shadow-lg whitespace-nowrap hover:from-amber-400 hover:to-amber-500 transition-all">Sign Up</Link>
              </motion.div>
            </div>
          </nav>

          {/* Hero */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-20">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mb-4 sm:mb-8">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-6 sm:py-2 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-full text-amber-300 text-[10px] sm:text-sm font-medium shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> ✦ OUR STORY &amp; VISION ✦
                </span>
              </motion.div>
              <motion.h1 className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 sm:mb-6 leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                <span className="text-white drop-shadow-2xl">Experiencing Christ</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 drop-shadow-2xl italic font-serif">as Living Word</span>
              </motion.h1>
              <motion.p className="text-sm sm:text-xl lg:text-2xl text-gray-200 mb-6 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                Pray-Read is a digital sanctuary — a living Altar where the Word of God ceases to be mere text and becomes <span className="italic font-serif text-amber-300">Spirit and Life</span> in the daily experience of every believer.
              </motion.p>
              <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
                <AuthProtectedLink href="/bible-reader">
                  <span className="group relative inline-flex px-5 py-2.5 sm:px-8 sm:py-4 text-sm sm:text-lg bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white font-bold rounded-full shadow-2xl shadow-amber-500/50 overflow-hidden w-full sm:w-auto items-center justify-center gap-2 cursor-pointer">
                    Open the Word <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </AuthProtectedLink>
                <Link href="/community" className="group px-5 py-2.5 sm:px-8 sm:py-4 text-sm sm:text-lg bg-white/10 backdrop-blur-md text-white font-semibold rounded-full border-2 border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl transition-all w-full sm:w-auto inline-flex items-center justify-center gap-2">
                  Join Community <Users className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                </Link>
              </motion.div>

              {/* PWA Install Banner — FIXED: navy/gold + REAL install, no blue/purple, no fake link */}
              {installState !== 'installed' && (
                <motion.div className="mt-8 sm:mt-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }}>
                  <button onClick={handleInstallClick} className="group w-full max-w-2xl mx-auto block p-4 sm:p-6 rounded-2xl backdrop-blur-md border transition-all duration-300 cursor-pointer text-left"
                    style={{ background: 'rgba(15,32,67,0.55)', borderColor: 'rgba(231,200,115,0.4)' }}>
                    <div className="flex items-center gap-4">
                      <span className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg,#0F2043,#8A6D1B)' }}>
                        <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-[#E7C873]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-white font-bold text-sm sm:text-lg flex items-center gap-2">
                          {installState === 'installing' ? 'Opening install…' : 'Install Our App'}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-400/30">FREE</span>
                        </span>
                        <span className="block text-gray-300 text-xs sm:text-sm">Read offline, faster loading, home screen access — tap to install</span>
                      </span>
                      <Download className="w-5 h-5 sm:w-6 sm:h-6 text-[#E7C873] group-hover:scale-110 transition-transform flex-shrink-0" />
                    </div>
                  </button>
                </motion.div>
              )}

              {/* Feature Pills */}
              <motion.div className="mt-10 sm:mt-16 flex flex-wrap items-center justify-center gap-2 sm:gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }}>
                {[
                  { icon: BookOpen, text: 'Interactive Bible Study', color: 'from-amber-500 to-amber-600', link: '/bible-reader' },
                  { icon: MessageCircleIcon, text: 'Q&A', color: 'from-[#0F2043] to-[#1E3A6E]', link: '/qa' },
                  { icon: Music, text: 'Verse-Songs', color: 'from-amber-500 to-[#8A6D1B]', link: '/verse-songs' },
                  { icon: Heart, text: 'Daily Devotionals', color: 'from-rose-500 to-red-500', link: '/devotional-plans' },
                ].map((f, i) => (
                  <Link key={i} href={f.link}>
                    <span className="group relative inline-flex px-3 py-2 sm:px-6 sm:py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer">
                      <span className="flex items-center gap-2"><span className={`p-1.5 sm:p-2 rounded-full bg-gradient-to-br ${f.color} group-hover:scale-110 transition-transform`}><f.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" /></span><span className="text-white text-xs sm:text-sm font-medium">{f.text}</span></span>
                    </span>
                  </Link>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        <RecommendedForYou />

        {/* Devotional Highlight — FIXED: navy/gold, was purple/pink */}
        <div className="relative z-10 w-full backdrop-blur-sm border-t py-16" style={{ background: 'linear-gradient(180deg, rgba(15,32,67,0.45), rgba(15,32,67,0.7))', borderColor: 'rgba(231,200,115,0.25)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Daily <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">Devotional Plans</span></h2>
              <p className="text-gray-200 text-base sm:text-lg max-w-2xl mx-auto">Discover inspiring devotional journeys designed to deepen your faith and strengthen your walk with God</p>
            </motion.div>
            <div className="flex justify-center">
              <Link href="/devotional-plans" className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-full shadow-2xl shadow-amber-500/50 hover:shadow-amber-500/70 transition-all flex items-center gap-3 text-lg">
                <Calendar className="w-6 h-6" /> Explore Devotional Plans <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Features Overview — FIXED: all "#" routes -> real routes */}
        <div className="relative z-10 w-full bg-gradient-to-b from-slate-900/50 to-slate-950/80 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true, margin: '-100px' }} className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Powerful <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">Bible Features</span></h2>
              <p className="text-gray-300 text-sm sm:text-lg max-w-2xl mx-auto">Explore all the tools available to deepen your Bible study and spiritual journey</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'messageCircle', title: 'Study Questions', desc: 'Dive deeper with contextual Q&A', route: '/qa', color: 'from-green-500 to-emerald-500' },
                { icon: 'bookOpen', title: 'Devotional Plans', desc: 'Daily spiritual journeys', route: '/devotional-plans', color: 'from-amber-400 to-orange-500' },
                { icon: 'bookOpen', title: 'Commentary', desc: 'Scholarly insights — read with commentary in the Bible Reader', route: '/bible-reader', color: 'from-blue-400 to-indigo-500' },
                { icon: 'music', title: 'Verse-Songs', desc: 'Worship through scripture music', route: '/verse-songs', color: 'from-violet-400 to-purple-600' },
                { icon: 'heart', title: 'Prayer Passages', desc: 'Daily devotion — start a devotional plan', route: '/devotional-plans', color: 'from-rose-400 to-red-500' },
                { icon: 'sparkles', title: 'Theological Insights', desc: 'Doctrinal analysis', route: '/theological-insights', color: 'from-yellow-400 to-amber-500' },
                { icon: 'clock', title: 'Historical Context', desc: 'Cultural background', route: '/historical-context', color: 'from-teal-400 to-cyan-500' },
                { icon: 'users', title: 'Open Discussion', desc: 'Join community conversations', route: '/discussion-groups', color: 'from-blue-500 to-indigo-600' },
                { icon: 'lightbulb', title: 'Share Revelations', desc: 'Post spiritual insights', route: '/community/revelations', color: 'from-violet-500 to-purple-600' },
                { icon: 'mic', title: 'Live Schedule', desc: 'Weekly teaching sessions', route: '/community/live-teaching', color: 'from-emerald-500 to-teal-600' },
                { icon: 'fileText', title: 'Verse Notes', desc: 'Personal annotations — track them on your Dashboard', route: '/dashboard', color: 'from-orange-400 to-amber-500' },
                { icon: 'link2', title: 'Cross References', desc: 'Related verses — explore them in the Bible Reader', route: '/bible-reader', color: 'from-cyan-400 to-teal-500' },
              ].map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.05 }} viewport={{ once: true, margin: '-100px' }} whileHover={{ y: -8 }}>
                  <Link href={feature.route}>
                    <span className="group relative block h-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer overflow-hidden">
                      <span className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      <span className="relative z-10 flex flex-col h-full">
                        <span className="mb-4 inline-flex"><span className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/30 group-hover:border-amber-400/60 transition-all">{getFeatureIcon(feature.icon)}</span></span>
                        <span className="text-lg sm:text-xl font-semibold text-white mb-2 group-hover:text-amber-300 transition-colors">{feature.title}</span>
                        <span className="text-gray-400 text-sm sm:text-base flex-grow mb-6">{feature.desc}</span>
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg font-medium text-sm group-hover:shadow-lg group-hover:shadow-amber-500/20">Start Study <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                      </span>
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} viewport={{ once: true, margin: '-100px' }} className="mt-12 sm:mt-20 text-center">
              <AuthProtectedLink href="/bible-reader">
                <span className="relative inline-flex px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full shadow-2xl shadow-amber-500/50 hover:shadow-amber-500/70 transition-all cursor-pointer items-center gap-2">
                  Start Exploring All Features <ArrowRight className="w-5 h-5" />
                </span>
              </AuthProtectedLink>
            </motion.div>
          </div>
        </div>
      </div>
      <AppFooter />
    </>
  );
}
