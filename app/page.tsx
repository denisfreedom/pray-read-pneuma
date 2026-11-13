"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Heart,
  Lightbulb,
  Link2,
  MessageCircle,
  Mic,
  Music,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import VerseOfTheDayModal from "@/components/VerseOfTheDayModal";
import AuthProtectedLink from "@/components/AuthProtectedLink";
import OfflineManager from "@/components/OfflineManager";
import AppFooter from "@/app/components/AppFooter";
import RecommendedForYou from "@/app/components/RecommendedForYou";
import SessionTracker from "@/app/components/SessionTracker";
import ContentNotificationBell from "@/app/components/ContentNotificationBell";

const LOGO = "/assets/PrayRead-logo.png";
const LOGO_FALLBACK =
  "https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png";

type Verse = {
  book_number?: number;
  book_id?: number;
  chapter: number;
  verse: number;
  text_english: string;
  name_english: string;
};

const features = [
  {
    icon: MessageCircle,
    title: "Study Questions",
    description: "Explore thoughtful, Scripture-grounded questions and discover the riches of the Word.",
    route: "/qa",
    tag: "Explore",
  },
  {
    icon: BookOpen,
    title: "Devotional Plans",
    description: "Build a consistent rhythm in the Word through guided devotional journeys.",
    route: "/devotional-plans",
    tag: "Grow daily",
  },
  {
    icon: BookOpen,
    title: "Bible Commentary",
    description: "Go deeper into the meaning, context, and spiritual significance of Scripture.",
    route: "/bible-reader",
    tag: "Go deeper",
  },
  {
    icon: Music,
    title: "Verse-Songs",
    description: "Meditate on the Word through Scripture-inspired music and worship.",
    route: "/verse-songs",
    tag: "Worship",
  },
  {
    icon: Heart,
    title: "Prayer Passages",
    description: "Turn the language of Scripture into personal prayer and fellowship with God.",
    route: "/devotional-plans",
    tag: "Pray the Word",
  },
  {
    icon: Sparkles,
    title: "Theological Insights",
    description: "Engage biblical themes and doctrinal insights with Christ at the centre.",
    route: "/theological-insights",
    tag: "Understand",
  },
  {
    icon: Clock,
    title: "Historical Context",
    description: "Discover the historical and cultural background that illuminates the text.",
    route: "/historical-context",
    tag: "Discover",
  },
  {
    icon: Users,
    title: "Open Discussion",
    description: "Learn alongside other believers through meaningful community conversations.",
    route: "/discussion-groups",
    tag: "Connect",
  },
  {
    icon: Lightbulb,
    title: "Share Revelations",
    description: "Record and share spiritual insights that encourage the growth of others.",
    route: "/community/revelations",
    tag: "Contribute",
  },
  {
    icon: Mic,
    title: "Live Schedule",
    description: "Keep up with scheduled teachings, live sessions, and shared learning.",
    route: "/community/live-teaching",
    tag: "Join live",
  },
  {
    icon: FileText,
    title: "Verse Notes",
    description: "Keep meaningful observations and personal notes as you study the Bible.",
    route: "/dashboard",
    tag: "Save insights",
  },
  {
    icon: Link2,
    title: "Cross References",
    description: "Follow connected passages and let Scripture illuminate Scripture.",
    route: "/bible-reader",
    tag: "Connect verses",
  },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c5a45d]/35 bg-[#c5a45d]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a7734]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#b18a42]" />
      {children}
    </div>
  );
}

function VerseOfDayStrip() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/verse-of-the-day", { cache: "no-store" });
        if (!response.ok) throw new Error("Verse request failed");
        const data = await response.json();
        const item = data?.verse || data || null;
        if (!cancelled && item?.text_english) setVerse(item);
        else if (!cancelled) setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !verse) return null;

  const bookNumber = verse.book_number ?? verse.book_id ?? 1;
  const reference = `${verse.name_english} ${verse.chapter}:${verse.verse}`;

  return (
    <section className="relative z-10 px-4 pb-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#d9c18a]/40 bg-[#10233d] px-6 py-9 text-center shadow-[0_24px_80px_rgba(7,20,39,0.22)] sm:px-12 sm:py-12"
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#d9c18a]/15" />
        <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-[#d9c18a]/15" />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.3em] text-[#e7c873]">
          <Sparkles className="mr-2 inline h-3.5 w-3.5" />
          Scripture for today
        </p>
        <p className="relative mx-auto mt-6 max-w-3xl font-serif text-2xl italic leading-relaxed text-white sm:text-3xl">
          “{verse.text_english}”
        </p>
        <p className="relative mt-5 text-sm font-semibold tracking-wide text-[#e7c873]">
          {reference}
        </p>
        <Link
          href={`/bible-reader/${bookNumber}/${verse.chapter}#verse-${verse.verse}`}
          className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-[#e2bd68] px-6 py-3 text-sm font-bold text-[#17263a] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f0d28c]"
        >
          Pray-Read this verse <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [particles, setParticles] = useState<
    Array<{ x: number; y: number; dx: number; dy: number; duration: number; delay: number }>
  >([]);
  const [isMounted, setIsMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [installState, setInstallState] = useState<
    "idle" | "installing" | "installed" | "no-prompt"
  >("idle");
  const installStateRef = useRef(installState);
  const installTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setInstall = useCallback((next: typeof installState) => {
    installStateRef.current = next;
    setInstallState(next);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    setUserEmail(localStorage.getItem("userEmail") || undefined);

    if (!reduceMotion) {
      const width = window.innerWidth || 1200;
      const height = window.innerHeight || 800;
      setParticles(
        Array.from({ length: 24 }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          dx: Math.random() * 100 - 50,
          dy: Math.random() * 100 - 50,
          duration: Math.random() * 12 + 14,
          delay: Math.random() * -15,
        }))
      );
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstall("installed");
    }
    return () => {
      if (installTimerRef.current) clearTimeout(installTimerRef.current);
    };
  }, [reduceMotion, setInstall]);

  const handleInstallClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const deferredPrompt = (window as Window & { __pwaDeferredPrompt?: any }).__pwaDeferredPrompt;

    if (deferredPrompt) {
      setInstall("installing");
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setInstall(outcome === "accepted" ? "installed" : "idle");
      } catch {
        setInstall("no-prompt");
      }
      return;
    }

    window.dispatchEvent(new CustomEvent("prb-open-install"));
    if (installTimerRef.current) clearTimeout(installTimerRef.current);
    installTimerRef.current = setTimeout(() => {
      const promptOpen = (window as Window & { __prbInstallPromptOpen?: boolean })
        .__prbInstallPromptOpen;
      if (!promptOpen && installStateRef.current === "idle") {
        window.location.href = "/install-prompt";
      }
    }, 1200);
  };

  const navLink =
    "rounded-full px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-[#f0d28c]";

  return (
    <>
      <SessionTracker />
      <VerseOfTheDayModal />
      <OfflineManager />

      <main className="min-h-screen overflow-hidden bg-[#f7f5ef] text-[#17263a]">
        {/* Hero / navigation */}
        <section className="relative isolate min-h-[760px] overflow-hidden bg-[#0c1b30] text-white sm:min-h-[820px]">
          <div
            className="absolute inset-0 -z-30 bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop)",
            }}
          />
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(115deg,rgba(7,18,34,.94)_0%,rgba(12,29,49,.82)_48%,rgba(12,29,49,.58)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071426]/35 via-transparent to-[#0c1b30]" />

          {isMounted && !reduceMotion && (
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
              {particles.map((particle, index) => (
                <motion.span
                  key={index}
                  className="absolute h-1 w-1 rounded-full bg-[#e7c873]/70"
                  initial={{ x: particle.x, y: particle.y, opacity: 0.15 }}
                  animate={{
                    x: [particle.x, particle.x + particle.dx],
                    y: [particle.y, particle.y + particle.dy],
                    opacity: [0.12, 0.55, 0.12],
                  }}
                  transition={{
                    duration: particle.duration,
                    delay: particle.delay,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <Link href="/" className="group flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[#e7c873]/70 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,.25)] sm:h-14 sm:w-14">
                <Image
                  src={logoSrc}
                  alt="Pray-Read Bible"
                  width={56}
                  height={56}
                  priority
                  className="h-full w-full object-contain"
                  onError={() => {
                    if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK);
                  }}
                />
              </span>
              <span className="leading-tight">
                <span className="block font-serif text-lg font-bold tracking-tight text-white sm:text-xl">
                  Pray-Read <span className="text-[#e7c873]">Bible</span>
                </span>
                <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55 sm:text-[10px]">
                  Experience the living Word
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <ContentNotificationBell userEmail={userEmail} />
              <Link href="/about" className={`${navLink} hidden sm:inline-flex`}>
                About
              </Link>
              <Link href="/community" className={`${navLink} hidden md:inline-flex`}>
                Community
              </Link>
              <a
                href="https://store.pesapal.com/donatetoprayreadbibleproject"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7c873]/45 px-3 py-2 text-xs font-semibold text-[#f0d28c] transition hover:bg-[#e7c873]/10 sm:px-4 sm:text-sm"
              >
                <Heart className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Donate</span>
              </a>
              {userEmail ? (
                <Link
                  href="/dashboard"
                  className="ml-1 rounded-full bg-[#e7c873] px-4 py-2.5 text-xs font-bold text-[#17263a] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f2d995] sm:px-5 sm:text-sm"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="ml-1 rounded-full bg-[#e7c873] px-4 py-2.5 text-xs font-bold text-[#17263a] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f2d995] sm:px-5 sm:text-sm"
                >
                  Get started
                </Link>
              )}
            </nav>
          </header>

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e7c873]/35 bg-white/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#f0d28c] shadow-lg backdrop-blur-md sm:text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              A Scripture-centred journey
            </motion.div>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="max-w-5xl font-serif text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Let the Word become
              <span className="mt-2 block bg-gradient-to-r from-[#f6dfa4] via-[#e7c873] to-[#c99c4b] bg-clip-text italic text-transparent">
                Spirit and Life.
              </span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22 }}
              className="mt-7 max-w-2xl text-base leading-8 text-slate-200/90 sm:text-lg"
            >
              Pray-Read is a digital sanctuary for meeting Christ in the Scriptures. Read the Word,
              pray the Word, and allow the living Word to shape your daily experience.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.34 }}
              className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
            >
              <AuthProtectedLink href="/bible-reader">
                <span className="group inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#e7c873] px-8 py-4 text-sm font-bold text-[#17263a] shadow-[0_12px_40px_rgba(199,157,76,.28)] transition hover:-translate-y-1 hover:bg-[#f2d995] sm:w-auto sm:text-base">
                  <BookOpen className="h-5 w-5" />
                  Open the Bible
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </AuthProtectedLink>
              <Link
                href="/community"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/[0.07] px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#e7c873]/70 hover:bg-white/10 sm:w-auto sm:text-base"
              >
                <Users className="h-5 w-5 text-[#e7c873]" />
                Join the community
              </Link>
            </motion.div>

            {installState !== "installed" && (
              <motion.button
                type="button"
                onClick={handleInstallClick}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.48 }}
                className="group mt-12 flex w-full max-w-xl items-center gap-4 rounded-2xl border border-white/15 bg-[#10233d]/65 p-4 text-left shadow-2xl backdrop-blur-xl transition hover:border-[#e7c873]/50 hover:bg-[#10233d]/85 sm:p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e7c873]/15 text-[#e7c873] sm:h-14 sm:w-14">
                  <Smartphone className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-white sm:text-base">
                    {installState === "installing" ? "Opening installation…" : "Take Pray-Read with you"}
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                      Free app
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-300">
                    Install for convenient access and an offline-ready experience.
                  </span>
                </span>
                <Download className="h-5 w-5 shrink-0 text-[#e7c873] transition group-hover:translate-y-0.5" />
              </motion.button>
            )}

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-medium text-white/65 sm:mt-16">
              <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#e7c873]" /> Read the Word</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#e7c873]/70 sm:block" />
              <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4 text-[#e7c873]" /> Pray the Word</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#e7c873]/70 sm:block" />
              <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#e7c873]" /> Live the Word</span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#f7f5ef] to-transparent" />
        </section>

        {/* Scripture for today */}
        <div className="relative z-10 -mt-2 bg-[#f7f5ef]">
          <VerseOfDayStrip />
        </div>

        <RecommendedForYou />

        {/* Introductory pathway */}
        <section className="relative overflow-hidden bg-[#f7f5ef] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#e7c873]/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
            >
              <SectionEyebrow>Our heart and vision</SectionEyebrow>
              <h2 className="max-w-xl font-serif text-3xl font-semibold leading-tight tracking-tight text-[#17263a] sm:text-5xl">
                More than reading.
                <span className="mt-2 block italic text-[#a17c39]">A life in the Word.</span>
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#586477]">
                The Scriptures are not merely information to collect. They are the living Word
                through whom we know and experience Christ. Pray-Read brings reading, meditation,
                prayer, study, and fellowship together in one purposeful space.
              </p>
              <Link
                href="/about"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#8b682c] transition hover:gap-3"
              >
                Discover the Pray-Read vision <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-[2rem] border border-[#d9c18a]/50" />
              <div className="relative overflow-hidden rounded-[1.7rem] bg-[#10233d] p-7 text-white shadow-[0_24px_70px_rgba(23,38,58,.18)] sm:p-10">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#e7c873]/20" />
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-[#e7c873]/20" />
                <p className="relative text-[10px] font-bold uppercase tracking-[0.25em] text-[#e7c873]">
                  The Pray-Read rhythm
                </p>
                <div className="relative mt-8 space-y-6">
                  {[
                    ["01", "READ", "Receive the Scripture with an attentive heart."],
                    ["02", "PRAY", "Turn the words of Scripture into fellowship with God."],
                    ["03", "LIVE", "Allow the Word to become your experience and expression."],
                  ].map(([number, title, description]) => (
                    <div key={number} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e7c873]/35 bg-[#e7c873]/10 font-serif text-sm text-[#e7c873]">
                        {number}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold tracking-[0.18em] text-white">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative mt-8 border-t border-white/10 pt-6 font-serif text-lg italic text-[#f0d28c]">
                  “The words that I speak unto you, they are spirit, and they are life.”
                  <span className="mt-2 block font-sans text-[10px] font-bold not-italic uppercase tracking-[0.2em] text-white/50">
                    John 6:63
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Devotional plans */}
        <section className="relative overflow-hidden bg-[#10233d] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-24">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#e7c873_0.7px,transparent_0.7px)] [background-size:24px_24px]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Build a daily rhythm</SectionEyebrow>
              <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-5xl">
                Let every day become
                <span className="block italic text-[#e7c873]">a journey with the Word.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Follow guided devotional journeys designed to help you remain in the Scriptures,
                grow in spiritual understanding, and cultivate a life of prayer.
              </p>
              <Link
                href="/devotional-plans"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#e7c873] px-7 py-4 text-sm font-bold text-[#17263a] shadow-xl transition hover:-translate-y-1 hover:bg-[#f2d995]"
              >
                <Calendar className="h-5 w-5" />
                Explore devotional plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Feature directory */}
        <section className="relative bg-[#f7f5ef] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-14 max-w-3xl text-center"
            >
              <SectionEyebrow>Explore the platform</SectionEyebrow>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#17263a] sm:text-5xl">
                Tools for a deeper
                <span className="block italic text-[#a17c39]">experience of Scripture.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#687386] sm:text-base">
                Everything is designed to help you engage the Bible thoughtfully, pray
                Scripture meaningfully, and grow together with other believers.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: (index % 3) * 0.07 }}
                    whileHover={reduceMotion ? undefined : { y: -5 }}
                  >
                    <Link
                      href={feature.route}
                      className="group flex h-full min-h-[245px] flex-col rounded-[1.4rem] border border-[#e5dfd1] bg-white p-6 shadow-[0_8px_30px_rgba(23,38,58,.045)] transition duration-300 hover:border-[#c8a75f]/70 hover:shadow-[0_20px_45px_rgba(23,38,58,.10)] sm:p-7"
                    >
                      <div className="flex items-start justify-between">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f0e4] text-[#9a7734] transition group-hover:bg-[#e7c873] group-hover:text-[#17263a]">
                          <Icon className="h-5 w-5" strokeWidth={1.8} />
                        </span>
                        <span className="rounded-full bg-[#f7f5ef] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9a7734]">
                          {feature.tag}
                        </span>
                      </div>
                      <h3 className="mt-6 font-serif text-xl font-semibold text-[#17263a] transition group-hover:text-[#987333]">
                        {feature.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-6 text-[#697487]">
                        {feature.description}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#9a7734]">
                        Explore feature
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-14 flex justify-center">
              <AuthProtectedLink href="/bible-reader">
                <span className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#10233d] px-8 py-4 text-sm font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#1a3557]">
                  Begin your Bible journey
                  <ArrowRight className="h-4 w-4 text-[#e7c873]" />
                </span>
              </AuthProtectedLink>
            </div>
          </div>
        </section>

        {/* Closing invitation */}
        <section className="bg-[#eee9dc] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 rounded-[1.7rem] border border-[#d9c18a]/50 bg-white px-7 py-9 text-center shadow-sm sm:px-10 lg:flex-row lg:text-left">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a7734]">
                Start where you are
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[#17263a] sm:text-3xl">
                Open the Word. Meet Christ. Grow in life.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#687386]">
                Make room for the living Word in your everyday walk with God.
              </p>
            </div>
            <AuthProtectedLink href="/bible-reader">
              <span className="inline-flex shrink-0 cursor-pointer items-center gap-3 rounded-full bg-[#e7c873] px-7 py-4 text-sm font-bold text-[#17263a] transition hover:bg-[#f0d28c]">
                Start reading <ArrowRight className="h-4 w-4" />
              </span>
            </AuthProtectedLink>
          </div>
        </section>
      </main>

      <AppFooter />
    </>
  );
}
