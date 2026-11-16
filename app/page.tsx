"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Heart,
  Lightbulb,
  Link2,
  MessageCircle,
  Mic2,
  Music2,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import AppFooter from "@/app/components/AppFooter";

// ── Client-only components — loaded with ssr:false so they NEVER run
// during the server render or first hydration. If any of them throws,
// the dynamic import shows nothing instead of crashing the whole site.
// This is the fix for "Application error: a client-side exception has
// occurred while loading" on first visit, then works after refresh
// (stale service-worker / window-only code).
const SessionTracker = dynamic(() => import("@/app/components/SessionTracker"), { ssr: false, loading: () => null });
const OfflineManager = dynamic(() => import("@/components/OfflineManager"), { ssr: false, loading: () => null });
const VerseOfTheDayModal = dynamic(() => import("@/components/VerseOfTheDayModal"), { ssr: false, loading: () => null });
const ContentNotificationBell = dynamic(() => import("@/app/components/ContentNotificationBell"), { ssr: false, loading: () => <span className="w-9 h-9 rounded-full bg-white/10" /> });
const RecommendedForYou = dynamic(() => import("@/app/components/RecommendedForYou"), { ssr: false, loading: () => null });
const AuthProtectedLink = dynamic(() => import("@/components/AuthProtectedLink"), { ssr: false, loading: (props: any) => <Link href={props?.href || "/bible-reader"}>{props?.children}</Link> }) as any;

const LOGO = "/assets/PrayRead-logo.png";
const LOGO_FALLBACK =
  "https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png";
const LANDSCAPE =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=85&w=2200&auto=format&fit=crop";

type Verse = {
  book_number?: number;
  book_id?: number;
  chapter: number;
  verse: number;
  text_english: string;
  name_english: string;
};

type DeferredInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallWindow = Window & {
  __pwaDeferredPrompt?: DeferredInstallPrompt;
  __prbInstallPromptOpen?: boolean;
};

const features = [
  { icon: MessageCircle, title: "Study questions", description: "Explore scripture with thoughtful, contextual Q&A.", href: "/qa" },
  { icon: BookOpen, title: "Devotional plans", description: "Build a steady rhythm with guided reading journeys.", href: "/devotional-plans" },
  { icon: BookOpen, title: "Bible commentary", description: "Discover historical and scholarly context as you read.", href: "/bible-reader" },
  { icon: Music2, title: "Verse-songs", description: "Carry scripture with you through music and worship.", href: "/verse-songs" },
  { icon: Heart, title: "Prayer passages", description: "Turn the words you read into a personal prayer practice.", href: "/devotional-plans" },
  { icon: Heart, title: "Prayer Library", description: "Prayers for every season — morning, healing, gratitude, family and more.", href: "/prayer-library" },
  { icon: Clock3, title: "Theological & Historical Insights", description: "Go deeper into the meaning and connections of scripture — plus the people, places, and world behind the text.", href: "/theological-insights" },
  { icon: Users, title: "Community discussion", description: "Learn alongside others through open conversations.", href: "/discussion-groups" },
  { icon: Lightbulb, title: "Share revelations", description: "Capture and share insights from your time in the Word.", href: "/community/revelations" },
  { icon: Mic2, title: "Live teaching", description: "Find upcoming teaching sessions and community events.", href: "/community/live-teaching" },
  { icon: FileText, title: "Verse notes", description: "Keep your personal reflections together on your dashboard.", href: "/dashboard" },
  { icon: Link2, title: "Cross references", description: "Follow the themes and passages connected across the Bible.", href: "/bible-reader" },
];

function VerseOfDay() {
  const [verse, setVerse] = useState<Verse | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function loadVerse() {
      try {
        const response = await fetch("/api/verse-of-the-day", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const currentVerse = (data?.verse || data) as Verse | null;
        if (!cancelled && currentVerse?.text_english) setVerse(currentVerse);
      } catch {}
    }
    void loadVerse();
    return () => { cancelled = true; };
  }, []);
  if (!verse) return null;
  const bookNumber = verse.book_number ?? verse.book_id ?? 1;
  const reference = `${verse.name_english} ${verse.chapter}:${verse.verse}`;
  return (
    <section className="bg-[#f8f6ef] px-5 py-12 sm:px-8 sm:py-16">
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.55 }} className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#17372f] px-6 py-10 text-center shadow-[0_24px_70px_-36px_rgba(20,45,37,0.55)] sm:px-14 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c981]">A moment in the Word</p>
        <p className="relative mx-auto mt-5 max-w-3xl font-serif text-2xl leading-relaxed text-white sm:text-3xl">“{verse.text_english}”</p>
        <p className="relative mt-4 text-sm font-medium text-[#e9c981]">{reference}</p>
        <Link href={`/bible-reader/${bookNumber}/${verse.chapter}#verse-${verse.verse}`} className="relative mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e9c981] px-6 py-3 text-sm font-semibold text-[#19362e] transition hover:bg-[#f2d99d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9c981]">Read and reflect <ArrowRight className="h-4 w-4" /></Link>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [mounted, setMounted] = useState(false);
  const [installState, setInstallState] = useState<"idle" | "installing" | "installed">("idle");
  const installStateRef = useRef(installState);
  const installTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateInstallState = (nextState: typeof installState) => {
    installStateRef.current = nextState;
    setInstallState(nextState);
  };
  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined") {
        setUserEmail(localStorage.getItem("userEmail") || undefined);
        if (window.matchMedia("(display-mode: standalone)").matches) {
          updateInstallState("installed");
        }
      }
    } catch {}
    return () => { if (installTimerRef.current) clearTimeout(installTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleInstallClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      const browserWindow = window as InstallWindow;
      const deferredPrompt = browserWindow.__pwaDeferredPrompt;
      if (deferredPrompt) {
        updateInstallState("installing");
        try {
          await deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          updateInstallState(outcome === "accepted" ? "installed" : "idle");
        } catch { updateInstallState("idle"); }
        return;
      }
      window.dispatchEvent(new CustomEvent("prb-open-install"));
      if (installTimerRef.current) clearTimeout(installTimerRef.current);
      installTimerRef.current = setTimeout(() => {
        if (browserWindow.__prbInstallPromptOpen) return;
        if (installStateRef.current === "idle") window.location.href = "/install-prompt";
      }, 1200);
    } catch {}
  };

  return (
    <>
      {mounted && <SessionTracker />}
      {mounted && <VerseOfTheDayModal />}
      {mounted && <OfflineManager />}
      <main className="min-h-screen overflow-hidden bg-[#f8f6ef] text-[#1d3029]">
        <section className="relative isolate min-h-[760px] overflow-hidden bg-[#10251f] text-white sm:min-h-[820px]">
          <div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-[center_44%]" style={{ backgroundImage: `url("${LANDSCAPE}")` }} />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(12,31,25,0.91)_0%,rgba(12,31,25,0.78)_50%,rgba(12,31,25,0.54)_100%)]" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,25,22,0.55)_0%,transparent_35%,rgba(11,25,22,0.27)_100%)]" />
          <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[#e9c981]/70 bg-white shadow-lg sm:h-12 sm:w-12">
                <Image src={logoSrc} alt="Pray-Read Bible" width={48} height={48} priority className="object-contain" onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
              </span>
              <span className="text-base font-semibold tracking-tight text-white sm:text-lg">Pray-Read <span className="text-[#e9c981]">Bible</span></span>
            </Link>
            <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-3">
              <Link href="/about" className="hidden rounded-full px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white sm:inline-flex">About</Link>
              <Link href="/community" className="hidden rounded-full px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white md:inline-flex">Community</Link>
              <Link href="/prayer-library" className="hidden rounded-full px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white md:inline-flex">Prayer Library</Link>
              {mounted ? <ContentNotificationBell userEmail={userEmail} /> : <span className="w-9 h-9 rounded-full bg-white/10" />}
              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:border-[#e9c981]/70 hover:bg-white/10 sm:inline-flex"><Heart className="h-4 w-4 text-[#e9c981]" />Donate</a>
              {userEmail ? <Link href="/dashboard" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#e9c981] px-4 text-sm font-semibold text-[#1c352d] transition hover:bg-[#f2d99d] sm:px-5">Dashboard</Link> : <Link href="/signup" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#e9c981] px-4 text-sm font-semibold text-[#1c352d] transition hover:bg-[#f2d99d] sm:px-5">Get started</Link>}
            </nav>
          </header>
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-12 lg:pb-24 lg:pt-20">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e9c981]/35 bg-[#e9c981]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#f1d99f] backdrop-blur-sm sm:text-xs"><Sparkles className="h-3.5 w-3.5" />Scripture for everyday life</span>
              <h1 className="mt-7 font-serif text-[3.25rem] leading-[1.03] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.25rem]">Meet the Word.<span className="mt-2 block italic text-[#e9c981]">Live it daily.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:mt-7 sm:text-lg sm:leading-8">Make space for a more personal walk with God. Pray-Read brings scripture, reflection, and a faith-filled community into one thoughtful daily practice.</p>
              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
                {mounted ? (
                  <AuthProtectedLink href="/bible-reader"><span className="group inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#e9c981] px-7 text-base font-semibold text-[#1a352c] shadow-[0_12px_35px_-18px_rgba(233,201,129,0.8)] transition hover:-translate-y-0.5 hover:bg-[#f2d99d] sm:w-auto">Begin with scripture<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></AuthProtectedLink>
                ) : (
                  <Link href="/bible-reader" className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#e9c981] px-7 text-base font-semibold text-[#1a352c] sm:w-auto">Begin with scripture<ArrowRight className="h-4 w-4" /></Link>
                )}
                <Link href="/community" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/[0.07] px-7 text-base font-medium text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/[0.13]">Find your community<Users className="h-4 w-4 text-[#e9c981]" /></Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/65 sm:mt-10 sm:text-sm"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e9c981]" />Read with intention</span><span className="hidden h-1 w-1 rounded-full bg-white/40 sm:block" /><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e9c981]" />Reflect at your pace</span></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.75, delay: 0.15, ease: "easeOut" }} className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] border border-white/10" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[#f8f6ef] p-6 text-[#1d3029] shadow-[0_35px_100px_-40px_rgba(0,0,0,0.8)] sm:p-8">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#78877b]">A simple rhythm</p><h2 className="mt-2 font-serif text-2xl text-[#19372f] sm:text-3xl">Make room for meaning.</h2></div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9eddf] text-[#315d4b]"><BookOpen className="h-6 w-6" /></span></div>
                <div className="relative mt-7 space-y-3"><div aria-hidden="true" className="absolute bottom-7 left-[1.08rem] top-7 w-px bg-[#d8ddcf]" />{[{ number: "01", title: "Read", text: "Open a passage and take it in." }, { number: "02", title: "Reflect", text: "Explore its meaning and context." }, { number: "03", title: "Respond", text: "Carry the Word into your day." }].map((step) => (<div key={step.number} className="relative flex items-center gap-4 rounded-2xl border border-[#e7e7df] bg-white/80 p-4"><span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dce4d8] bg-[#f2f4ec] text-[10px] font-bold tracking-wide text-[#53705e]">{step.number}</span><span><span className="block text-sm font-semibold text-[#213b31]">{step.title}</span><span className="mt-0.5 block text-xs leading-5 text-[#778176]">{step.text}</span></span></div>))}</div>
                <Link href="/bible-reader" className="group mt-5 flex items-center justify-between rounded-2xl bg-[#1d4035] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#285445]">Open the Bible reader<ArrowRight className="h-4 w-4 text-[#e9c981] transition-transform group-hover:translate-x-1" /></Link>
              </div>
              <div className="absolute -bottom-5 -left-6 hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#18372e]/95 px-4 py-3 text-white shadow-xl backdrop-blur-md sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9c981]/15 text-[#e9c981]"><Heart className="h-4 w-4" /></span><span><span className="block text-xs font-semibold">A daily practice</span><span className="mt-0.5 block text-[10px] text-white/60">Rooted in the living Word</span></span></div>
            </motion.div>
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-12"><div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/15 pt-6 sm:justify-start sm:gap-3">{[{ icon: BookOpen, label: "Bible study", href: "/bible-reader" }, { icon: MessageCircle, label: "Questions", href: "/qa" }, { icon: Music2, label: "Verse-songs", href: "/verse-songs" }, { icon: Heart, label: "Devotionals", href: "/devotional-plans" }].map(({ icon: Icon, label, href }) => (<Link key={label} href={href} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-xs font-medium text-white/85 transition hover:border-[#e9c981]/60 hover:bg-white/10 hover:text-white sm:text-sm"><Icon className="h-4 w-4 text-[#e9c981]" />{label}</Link>))}</div></div>
        </section>
