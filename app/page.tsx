"use client";

import { motion } from 'framer-motion';
import { BookOpen, Users, Heart, Sparkles, ArrowRight, Calendar, FileText, Clock, Lightbulb, MessageCircle as MessageCircleIcon, Music, Download, Smartphone, Mic, Link2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';
import dynamic from 'next/dynamic';
const VerseOfTheDayModal = dynamic(() => import('@/components/VerseOfTheDayModal'), { ssr: false, loading: () => null });
const AuthProtectedLink = dynamic(() => import('@/components/AuthProtectedLink'), { ssr: false, loading: (props: any) => <Link href={props?.href || '/bible-reader'}>{props?.children}</Link> }) as any;
const OfflineManager = dynamic(() => import('@/components/OfflineManager'), { ssr: false, loading: () => null });
const RecommendedForYou = dynamic(() => import('@/app/components/RecommendedForYou'), { ssr: false, loading: () => null });
const SessionTracker = dynamic(() => import('@/app/components/SessionTracker'), { ssr: false, loading: () => null });
const ContentNotificationBell = dynamic(() => import('@/app/components/ContentNotificationBell'), { ssr: false, loading: () => <span className="w-9 h-9 rounded-full bg-[#efe9d8]" /> });
import AppFooter from '@/app/components/AppFooter';

// app/page.tsx — REDESIGNED ELEGANT THEME
// New look: ivory / warm paper + deep emerald + soft gold, serif headings, calm editorial layout.
// Kept from before: Prayer Library in header + Prayer Library card, Theological & Historical merged,
// Verse of the Day on the page, real PWA install (no forced redirect), Dashboard for signed-in users,
// all 12 feature cards and all routes unchanged.

const LOGO = '/assets/PrayRead-logo.png';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';
const LANDSCAPE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=85&w=2200&auto=format&fit=crop';

const getFeatureIcon = (iconName: string) => {
  const icons: Record<string, ReactNode> = {
    messageCircle: <MessageCircleIcon className="w-6 h-6 text-[#1d4035]" />,
    bookOpen: <BookOpen className="w-6 h-6 text-[#1d4035]" />,
    music: <Music className="w-6 h-6 text-[#1d4035]" />,
    heart: <Heart className="w-6 h-6 text-[#1d4035]" />,
    sparkles: <Sparkles className="w-6 h-6 text-[#1d4035]" />,
    clock: <Clock className="w-6 h-6 text-[#1d4035]" />,
    users: <Users className="w-6 h-6 text-[#1d4035]" />,
    lightbulb: <Lightbulb className="w-6 h-6 text-[#1d4035]" />,
    mic: <Mic className="w-6 h-6 text-[#1d4035]" />,
    fileText: <FileText className="w-6 h-6 text-[#1d4035]" />,
    link2: <Link2 className="w-6 h-6 text-[#1d4035]" />,
  };
  return icons[iconName] || <BookOpen className="w-6 h-6 text-[#1d4035]" />;
};

const FEATURES = [
  { icon: 'messageCircle', title: 'Study Questions', desc: 'Dive deeper with contextual Q&A', route: '/qa' },
  { icon: 'bookOpen', title: 'Devotional Plans', desc: 'Daily spiritual journeys', route: '/devotional-plans' },
  { icon: 'bookOpen', title: 'Commentary', desc: 'Scholarly insights — read with commentary in the Bible Reader', route: '/bible-reader' },
  { icon: 'music', title: 'Verse-Songs', desc: 'Worship through scripture music', route: '/verse-songs' },
  { icon: 'heart', title: 'Prayer Passages', desc: 'Daily devotion — start a devotional plan', route: '/devotional-plans' },
  { icon: 'heart', title: 'Prayer Library', desc: 'Prayers for every season — morning, healing, gratitude, family and more', route: '/prayer-library' },
  { icon: 'clock', title: 'Theological & Historical Insights', desc: 'Doctrinal analysis + cultural background — the meaning and the world behind the text', route: '/theological-insights' },
  { icon: 'users', title: 'Open Discussion', desc: 'Join community conversations', route: '/discussion-groups' },
  { icon: 'lightbulb', title: 'Share Revelations', desc: 'Post spiritual insights', route: '/community/revelations' },
  { icon: 'mic', title: 'Live Schedule', desc: 'Weekly teaching sessions', route: '/community/live-teaching' },
  { icon: 'fileText', title: 'Verse Notes', desc: 'Personal annotations — track them on your Dashboard', route: '/dashboard' },
  { icon: 'link2', title: 'Cross References', desc: 'Related verses — explore them in the Bible Reader', route: '/bible-reader' },
];

function VerseOfDayStrip() {
  const [verse, setVerse] = useState<{ book_number?: number; book_id?: number; chapter: number; verse: number; text_english: string; name_english: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/verse-of-the-day', { cache: 'no-store' });
        const data = await res.json();
        const v = data?.verse || data || null;
        if (!cancelled && v?.text_english) setVerse(v);
        else if (!cancelled) setFailed(true);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, []);
  if (failed || !verse) return null;
  const bookNum = verse.book_number ?? verse.book_id ?? 1;
  const ref = `${verse.name_english} ${verse.chapter}:${verse.verse}`;
  return (
    <section className="bg-[#faf8f2] px-5 pb-4 pt-2 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }} className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#e8dfc8] bg-white px-6 py-10 text-center shadow-[0_24px_60px_-30px_rgba(29,64,53,0.25)] sm:px-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#a9852e]">✦ &nbsp;Verse of the Day&nbsp; ✦</p>
        <p className="mx-auto mt-5 max-w-3xl font-serif text-2xl leading-relaxed text-[#1d4035] sm:text-[2rem]">“{verse.text_english}”</p>
        <p className="mt-4 text-sm font-semibold text-[#a9852e]">— {ref}</p>
        <Link href={`/bible-reader/${bookNum}/${verse.chapter}#verse-${verse.verse}`} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1d4035] px-7 text-sm font-semibold text-white transition hover:bg-[#285445]">Pray-Read this verse <ArrowRight className="h-4 w-4" /></Link>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'installed' | 'no-prompt'>('idle');
  const installStateRef = useRef(installState);
  const installTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setInstall = (s: typeof installState) => { installStateRef.current = s; setInstallState(s); };
  useEffect(() => {
    setIsMounted(true);
    try { setUserEmail(localStorage.getItem('userEmail') || undefined); } catch {}
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) setInstall('installed');
    return () => { if (installTimerRef.current) clearTimeout(installTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleInstallClick = async (e: ReactMouseEvent) => {
    e.preventDefault();
    const deferred: any = (window as any).__pwaDeferredPrompt;
    if (deferred) {
      setInstall('installing');
      try { await deferred.prompt(); const { outcome } = await deferred.userChoice; setInstall(outcome === 'accepted' ? 'installed' : 'idle'); } catch { setInstall('no-prompt'); }
      return;
    }
    window.dispatchEvent(new CustomEvent('prb-open-install'));
    if (installTimerRef.current) clearTimeout(installTimerRef.current);
    installTimerRef.current = setTimeout(() => {
      if ((window as any).__prbInstallPromptOpen) return;
      if (installStateRef.current === 'idle') window.location.href = '/install-prompt';
    }, 1200);
  };
  return (
    <>
      {isMounted && <SessionTracker />}
      {isMounted && <VerseOfTheDayModal />}
      {isMounted && <OfflineManager />}
      <div className="min-h-screen bg-[#faf8f2] text-[#22382f] antialiased">
        {/* Top hairline */}
        <div className="bg-[#1d4035] text-center text-[11px] font-medium tracking-[0.18em] text-[#e9c981] uppercase py-2 px-4">Scripture &nbsp;·&nbsp; Prayer &nbsp;·&nbsp; Community</div>
        {/* Header — sticky, light, elegant */}
        <header className="sticky top-0 z-40 border-b border-[#ece4d0] bg-[#faf8f2]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#e9c981] bg-white shadow-sm sm:h-12 sm:w-12">
                <Image src={logoSrc} alt="Pray-Read Bible Logo" width={48} height={48} priority className="object-contain" onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
              </span>
              <span className="leading-none"><span className="block font-serif text-lg font-bold text-[#1d4035] sm:text-xl">Pray-Read <span className="text-[#a9852e]">Bible</span></span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a927f]">Meet the Word · Live it daily</span></span>
            </Link>
            <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
              {isMounted ? <ContentNotificationBell userEmail={userEmail} /> : <span className="w-9 h-9 rounded-full bg-[#efe9d8]" />}
              <Link href="/about" className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#3d5247] transition hover:bg-[#efe9d8] hover:text-[#1d4035] sm:inline-flex">About</Link>
              <Link href="/community" className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#3d5247] transition hover:bg-[#efe9d8] hover:text-[#1d4035] md:inline-flex">Community</Link>
              <Link href="/prayer-library" className="hidden rounded-full border border-[#e9c981]/70 bg-[#fdf6e3] px-4 py-2 text-sm font-semibold text-[#1d4035] transition hover:bg-[#f5ead0] md:inline-flex">🙏 Prayer Library</Link>
              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-full border border-[#1d4035]/20 px-4 py-2 text-sm font-medium text-[#1d4035] transition hover:bg-white sm:inline-flex"><Heart className="h-4 w-4 text-[#a9852e]" /> Donate</a>
              {userEmail ? (<Link href="/dashboard" className="rounded-full bg-[#1d4035] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#285445] sm:px-5">Dashboard</Link>) : (<Link href="/signup" className="rounded-full bg-[#1d4035] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#285445] sm:px-5">Get started</Link>)}
            </nav>
          </div>
        </header>

        {/* Hero — editorial, light */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#f0e8d2] blur-3xl opacity-70" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-64 h-72 w-72 rounded-full bg-[#dce8dd] blur-3xl opacity-60" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#e8dfc8] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a9852e]"><Sparkles className="h-3.5 w-3.5" /> Scripture for everyday life</p>
              <h1 className="mt-6 font-serif text-[3.1rem] leading-[1.02] tracking-[-0.02em] text-[#1d4035] sm:text-6xl lg:text-[4.9rem]">Meet the Word.<br /><span className="italic font-normal text-[#a9852e]">Live it daily.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#5a6b5e] sm:text-lg">Make space for a more personal walk with God. Pray-Read brings scripture, reflection, and a faith-filled community into one thoughtful daily practice.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <AuthProtectedLink href="/bible-reader"><span className="group inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1d4035] px-7 text-base font-semibold text-white shadow-[0_16px_35px_-18px_rgba(29,64,53,0.6)] transition hover:bg-[#285445]">Begin with scripture <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></AuthProtectedLink>
                <Link href="/prayer-library" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#1d4035]/25 bg-white px-7 text-base font-semibold text-[#1d4035] transition hover:border-[#a9852e] hover:bg-[#fdf6e3]">🙏 Open Prayer Library</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6b7a6e]"><span>✦ Read with intention</span><span>✦ Reflect at your pace</span><span>✦ Respond in prayer</span></div>
              <div className="mt-8 flex flex-wrap gap-2">{[{ icon: BookOpen, label: 'Bible study', href: '/bible-reader' }, { icon: MessageCircleIcon, label: 'Questions', href: '/qa' }, { icon: Music, label: 'Verse-songs', href: '/verse-songs' }, { icon: Heart, label: 'Devotionals', href: '/devotional-plans' }].map(({ icon: Icon, label, href }) => (<Link key={label} href={href} className="inline-flex items-center gap-2 rounded-full border border-[#e8dfc8] bg-white px-4 py-2 text-xs font-medium text-[#3d5247] transition hover:border-[#a9852e]"><Icon className="h-4 w-4 text-[#a9852e]" />{label}</Link>))}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
              <div className="overflow-hidden rounded-[2rem] border border-[#e8dfc8] bg-white p-2 shadow-[0_30px_70px_-30px_rgba(29,64,53,0.35)]">
                <div className="relative h-[320px] overflow-hidden rounded-[1.6rem] sm:h-[420px]"><Image src={LANDSCAPE} alt="Mountains at sunrise" width={1200} height={800} className="h-full w-full object-cover" priority /><div className="absolute inset-0 bg-gradient-to-t from-[#1d4035]/70 via-transparent to-transparent" /><div className="absolute bottom-5 left-5 right-5 text-white"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#e9c981]">A simple rhythm</p><p className="mt-2 font-serif text-2xl leading-snug">Make room for meaning.</p></div></div>
                <div className="grid grid-cols-3 gap-2 p-2 sm:gap-3 sm:p-3">{[{ n: '01', t: 'Read', d: 'Open a passage' }, { n: '02', t: 'Reflect', d: 'Explore meaning' }, { n: '03', t: 'Respond', d: 'Carry it today' }].map(s => (<div key={s.n} className="rounded-2xl bg-[#f6f2e6] px-3 py-3 text-center sm:py-4"><p className="text-[10px] font-bold tracking-widest text-[#a9852e]">{s.n}</p><p className="mt-1 text-sm font-bold text-[#1d4035]">{s.t}</p><p className="mt-0.5 text-[11px] leading-4 text-[#6b7a6e]">{s.d}</p></div>))}</div>
                <Link href="/bible-reader" className="group m-2 flex items-center justify-between rounded-2xl bg-[#1d4035] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#285445] sm:m-3">Open the Bible reader <ArrowRight className="h-4 w-4 text-[#e9c981] transition-transform group-hover:translate-x-1" /></Link>
              </div>
              <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-[#e8dfc8] bg-white px-4 py-3 shadow-lg sm:flex"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf6e3] text-[#a9852e]"><Heart className="h-5 w-5" /></span><span><span className="block text-xs font-bold text-[#1d4035]">A daily practice</span><span className="block text-[11px] text-[#6b7a6e]">Rooted in the living Word</span></span></div>
            </motion.div>
          </div>
        </section>

        {/* Verse of the Day */}
        <VerseOfDayStrip />

        {/* Prayer Library spotlight — new, elegant */}
        <section className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#1d4035] text-white shadow-[0_30px_70px_-30px_rgba(29,64,53,0.6)]">
            <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_auto] lg:p-14">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#e9c981]">🙏 &nbsp;Prayer Library</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-[2.9rem]">A prayer for every<br className="hidden sm:block" /> season of life.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">Morning, healing, gratitude, family, work, rest — find words when yours run out, and pray them in English or Luganda.</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-medium"><span className="rounded-full bg-white/10 px-3 py-1.5">Morning</span><span className="rounded-full bg-white/10 px-3 py-1.5">Healing</span><span className="rounded-full bg-white/10 px-3 py-1.5">Gratitude</span><span className="rounded-full bg-white/10 px-3 py-1.5">Family</span><span className="rounded-full bg-white/10 px-3 py-1.5">Peace</span></div></div>
              <Link href="/prayer-library" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#e9c981] px-8 text-sm font-bold text-[#1d4035] transition hover:bg-[#f2d99d] sm:text-base">Open Prayer Library <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </section>

        {/* Devotional */}
        <section className="px-5 pb-6 sm:px-8"><div className="mx-auto max-w-7xl"><div className="grid items-center gap-8 rounded-[2rem] border border-[#e8dfc8] bg-[#efe9d8] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12"><div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a9852e]">Grow one day at a time</p><h2 className="mt-3 font-serif text-3xl leading-tight text-[#1d4035] sm:text-4xl">A little time in the Word can change the shape of your day.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#5a6b5e] sm:text-base">Find a devotional journey for the season you are in, and return to scripture with fresh intention each day.</p></div><Link href="/devotional-plans" className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#1d4035] px-7 text-sm font-semibold text-white transition hover:bg-[#285445]"><Calendar className="h-5 w-5 text-[#e9c981]" /> Explore devotional plans <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></div></div></section>

        {/* Install — light, calm */}
        {isMounted && installState !== 'installed' && (
          <section className="px-5 py-6 sm:px-8"><button type="button" onClick={handleInstallClick} className="group mx-auto flex w-full max-w-5xl items-center gap-4 rounded-[1.5rem] border border-[#e8dfc8] bg-white px-5 py-4 text-left shadow-sm transition hover:border-[#d8cdaa] sm:px-6 sm:py-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#efe9d8] text-[#1d4035]"><Smartphone className="h-6 w-6" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#1d4035] sm:text-base">{installState === 'installing' ? 'Opening install options…' : 'Take Pray-Read with you'} <span className="rounded-full bg-[#eef3ea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3f6b4a]">Free app</span></span><span className="mt-1 block text-xs leading-5 text-[#6b7a6e] sm:text-sm">Install for quick access and an easier reading experience.</span></span><Download className="h-5 w-5 shrink-0 text-[#a9852e] transition group-hover:translate-y-0.5" /></button></section>
        )}

        <div className="py-2">{isMounted && <RecommendedForYou />}</div>

        {/* Features — light elegant cards */}
        <section className="px-5 pb-20 pt-10 sm:px-8 sm:pb-24"><div className="mx-auto max-w-7xl"><div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a9852e]">Everything in one place</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#1d4035] sm:text-5xl">A deeper way to engage with scripture</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#6b7a6e] sm:text-base">Read, study, pray, and connect with tools designed to support your faith journey.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">{FEATURES.map(({ icon, title, desc, route }, index) => (<motion.div key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: Math.min(index % 3, 2) * 0.06 }} whileHover={{ y: -4 }}><Link href={route} className="group flex h-full min-h-[190px] flex-col rounded-[1.5rem] border border-[#e8dfc8] bg-white p-6 shadow-[0_14px_35px_-28px_rgba(29,64,53,0.35)] transition hover:border-[#d8cdaa] hover:shadow-[0_22px_44px_-28px_rgba(29,64,53,0.3)] sm:p-7"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f2e6] text-[#1d4035] transition group-hover:bg-[#efe9d8]">{getFeatureIcon(icon)}</span><span className="mt-5 flex items-center justify-between gap-3"><span className="text-base font-bold text-[#1d4035] sm:text-lg">{title}</span><ArrowRight className="h-4 w-4 shrink-0 text-[#a0a99c] transition group-hover:translate-x-1 group-hover:text-[#1d4035]" /></span><span className="mt-2 text-sm leading-6 text-[#6b7a6e]">{desc}</span><span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#f6f2e6] px-4 py-2 text-xs font-semibold text-[#1d4035] transition group-hover:bg-[#1d4035] group-hover:text-white">Open {title.includes('Prayer') ? 'Prayer Library' : title} <ArrowRight className="h-3.5 w-3.5" /></span></Link></motion.div>))}</div><div className="mt-10 text-center sm:mt-14"><AuthProtectedLink href="/bible-reader"><span className="group inline-flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-full bg-[#1d4035] px-8 text-sm font-semibold text-white transition hover:bg-[#285445] sm:text-base">Explore Pray-Read Bible <ArrowRight className="h-4 w-4 text-[#e9c981] transition-transform group-hover:translate-x-1" /></span></AuthProtectedLink></div></div></section>

        {/* Community CTA */}
        <section className="px-5 pb-16 sm:px-8 sm:pb-20"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] border border-[#e8dfc8] bg-white p-7 shadow-sm sm:p-10 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a9852e]">Keep growing</p><h2 className="mt-3 font-serif text-3xl leading-tight text-[#1d4035] sm:text-4xl">Let the Word meet you where you are.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#6b7a6e] sm:text-base">Start with a passage, follow a question, or find a community conversation that helps you keep exploring.</p></div><Link href="/community" className="group inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-[#e9c981] px-7 text-sm font-bold text-[#1d4035] transition hover:bg-[#f2d99d] sm:text-base">Join the community <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></div></section>
      </div>
      <AppFooter />
    </>
  );
}
