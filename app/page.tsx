"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  Menu,
  MessageCircle,
  Mic2,
  Music2,
  Quote,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import AppFooter from "@/app/components/AppFooter";
import ContentNotificationBell from "@/app/components/ContentNotificationBell";
import RecommendedForYou from "@/app/components/RecommendedForYou";
import SessionTracker from "@/app/components/SessionTracker";
import AuthProtectedLink from "@/components/AuthProtectedLink";
import OfflineManager from "@/components/OfflineManager";
import VerseOfTheDayModal from "@/components/VerseOfTheDayModal";

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
  {
    icon: MessageCircle,
    category: "Study",
    title: "Study questions",
    description: "Explore scripture with thoughtful, contextual Q&A.",
    href: "/qa",
  },
  {
    icon: BookOpen,
    category: "Rhythm",
    title: "Devotional plans",
    description: "Build a steady rhythm with guided reading journeys.",
    href: "/devotional-plans",
  },
  {
    icon: BookOpen,
    category: "Depth",
    title: "Bible commentary",
    description: "Discover historical and scholarly context as you read.",
    href: "/bible-reader",
  },
  {
    icon: Music2,
    category: "Worship",
    title: "Verse-songs",
    description: "Carry scripture with you through music and worship.",
    href: "/verse-songs",
  },
  {
    icon: Heart,
    category: "Prayer",
    title: "Prayer passages",
    description: "Turn the words you read into a personal prayer practice.",
    href: "/devotional-plans",
  },
  {
    icon: Sparkles,
    category: "Depth",
    title: "Theological insights",
    description: "Go deeper into the meaning and connections of scripture.",
    href: "/theological-insights",
  },
  {
    icon: Clock3,
    category: "Context",
    title: "Historical context",
    description: "Understand the people, places, and world behind the text.",
    href: "/historical-context",
  },
  {
    icon: Users,
    category: "Fellowship",
    title: "Community discussion",
    description: "Learn alongside others through open conversations.",
    href: "/discussion-groups",
  },
  {
    icon: Lightbulb,
    category: "Fellowship",
    title: "Share revelations",
    description: "Capture and share insights from your time in the Word.",
    href: "/community/revelations",
  },
  {
    icon: Mic2,
    category: "Gather",
    title: "Live teaching",
    description: "Find upcoming teaching sessions and community events.",
    href: "/community/live-teaching",
  },
  {
    icon: FileText,
    category: "Personal",
    title: "Verse notes",
    description: "Keep your personal reflections together on your dashboard.",
    href: "/dashboard",
  },
  {
    icon: Link2,
    category: "Study",
    title: "Cross references",
    description: "Follow the themes and passages connected across the Bible.",
    href: "/bible-reader",
  },
];

function VerseOfDay() {
  const [verse, setVerse] = useState<Verse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVerse() {
      try {
        const response = await fetch("/api/verse-of-the-day", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const currentVerse = (data?.verse || data) as Verse | null;
        if (!cancelled && currentVerse?.text_english) {
          setVerse(currentVerse);
        }
      } catch {
        // Keep the page clean when the verse service is temporarily unavailable.
      }
    }

    void loadVerse();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!verse) return null;

  const bookNumber = verse.book_number ?? verse.book_id ?? 1;
  const reference = `${verse.name_english} ${verse.chapter}:${verse.verse}`;

  return (
    <section className="relative bg-[#f8f6ef] px-5 py-12 sm:px-8 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] border border-[#285445]/60 bg-[#143028] px-6 py-12 text-center shadow-[0_32px_80px_-36px_rgba(16,37,31,0.65)] sm:px-14 sm:py-16"
      >
        {/* Ambient radial light & sacred geometry rings */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e9c981]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-[#e9c981]/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full border border-white/[0.06]"
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e9c981]/30 bg-[#e9c981]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c981]">
            <Quote className="h-3.5 w-3.5" />A moment in the Word
          </span>

          <blockquote className="mt-7 font-serif text-2xl leading-[1.45] tracking-tight text-white sm:text-3xl lg:text-[2.15rem]">
            “{verse.text_english}”
          </blockquote>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-8 bg-[#e9c981]/40" />
            <p className="text-sm font-semibold tracking-wide text-[#e9c981]">
              {reference}
            </p>
            <span className="h-px w-8 bg-[#e9c981]/40" />
          </div>

          <Link
            href={`/bible-reader/${bookNumber}/${verse.chapter}#verse-${verse.verse}`}
            className="group relative mt-8 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-[#e9c981] px-7 py-3 text-sm font-semibold text-[#163129] shadow-[0_12px_30px_-12px_rgba(233,201,129,0.75)] transition hover:-translate-y-0.5 hover:bg-[#f2d99d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9c981]"
          >
            Read and reflect
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installState, setInstallState] = useState<
    "idle" | "installing" | "installed"
  >("idle");
  const installStateRef = useRef(installState);
  const installTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateInstallState = (nextState: typeof installState) => {
    installStateRef.current = nextState;
    setInstallState(nextState);
  };

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail") || undefined);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      updateInstallState("installed");
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (installTimerRef.current) clearTimeout(installTimerRef.current);
    };
    // State is initialized once from browser-only values after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const browserWindow = window as InstallWindow;
    const deferredPrompt = browserWindow.__pwaDeferredPrompt;

    if (deferredPrompt) {
      updateInstallState("installing");
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        updateInstallState(outcome === "accepted" ? "installed" : "idle");
      } catch {
        updateInstallState("idle");
      }
      return;
    }

    window.dispatchEvent(new CustomEvent("prb-open-install"));
    if (installTimerRef.current) clearTimeout(installTimerRef.current);
    installTimerRef.current = setTimeout(() => {
      if (browserWindow.__prbInstallPromptOpen) return;
      if (installStateRef.current === "idle") {
        window.location.href = "/install-prompt";
      }
    }, 1200);
  };

  return (
    <>
      <SessionTracker />
      <VerseOfTheDayModal />
      <OfflineManager />

      <main className="min-h-screen overflow-x-clip bg-[#f8f6ef] text-[#1d3029] selection:bg-[#e9c981] selection:text-[#163129]">
        {/* ================= HERO SECTION ================= */}
        <section className="relative isolate min-h-[780px] overflow-hidden bg-[#0f231d] text-white sm:min-h-[840px]">
          {/* Background Imagery & Layered Atmospheric Gradients */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 scale-105 bg-cover bg-[center_42%] transition-transform duration-1000"
            style={{ backgroundImage: `url("${LANDSCAPE}")` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,rgba(11,29,23,0.94)_0%,rgba(13,34,27,0.82)_48%,rgba(14,36,29,0.52)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_28%,rgba(233,201,129,0.16),transparent_46%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(9,22,18,0.65)_0%,transparent_30%,rgba(11,27,22,0.45)_100%)]"
          />

          {/* Sticky Top Navigation */}
          <header
            className={`sticky top-0 z-30 transition-all duration-300 ${
              scrolled
                ? "border-b border-white/10 bg-[#0f231d]/85 py-3.5 backdrop-blur-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]"
                : "py-5 sm:py-6"
            }`}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
              <Link href="/" className="group flex shrink-0 items-center gap-3.5">
                <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[#e9c981]/75 bg-white shadow-[0_8px_24px_-8px_rgba(233,201,129,0.5)] transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12">
                  <Image
                    src={logoSrc}
                    alt="Pray-Read Bible"
                    width={48}
                    height={48}
                    priority
                    className="object-contain"
                    onError={() => {
                      if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK);
                    }}
                  />
                </span>
                <span className="flex flex-col">
                  <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
                    Pray-Read <span className="text-[#e9c981]">Bible</span>
                  </span>
                  <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-white/50 sm:block">
                    Scripture &amp; Reflection
                  </span>
                </span>
              </Link>

              <nav
                aria-label="Main navigation"
                className="flex items-center gap-1.5 sm:gap-2.5"
              >
                <Link
                  href="/about"
                  className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white sm:inline-flex"
                >
                  About
                </Link>
                <Link
                  href="/community"
                  className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  Community
                </Link>
                <ContentNotificationBell userEmail={userEmail} />
                <a
                  href="https://store.pesapal.com/donatetoprayreadbibleproject"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden items-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-[#e9c981]/70 hover:bg-white/10 sm:inline-flex"
                >
                  <Heart className="h-4 w-4 text-[#e9c981]" />
                  Donate
                </a>
                {userEmail ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#e9c981] px-4 text-sm font-semibold text-[#17322a] shadow-[0_8px_24px_-10px_rgba(233,201,129,0.75)] transition hover:bg-[#f2d99d] sm:px-5"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#e9c981] px-4 text-sm font-semibold text-[#17322a] shadow-[0_8px_24px_-10px_rgba(233,201,129,0.75)] transition hover:bg-[#f2d99d] sm:px-5"
                  >
                    Get started
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Toggle navigation menu"
                  aria-expanded={mobileMenuOpen}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white transition hover:bg-white/15 sm:hidden"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </nav>
            </div>

            {/* Mobile Dropdown Navigation */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-white/10 bg-[#0f231d]/95 backdrop-blur-xl sm:hidden"
                >
                  <div className="flex flex-col gap-2 px-5 py-4">
                    <Link
                      href="/about"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                      About
                    </Link>
                    <Link
                      href="/community"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                      Community
                    </Link>
                    <a
                      href="https://store.pesapal.com/donatetoprayreadbibleproject"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[#e9c981] hover:bg-white/10"
                    >
                      <Heart className="h-4 w-4" />
                      Donate to Pray-Read
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Hero Main Grid */}
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-12 lg:pb-24 lg:pt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e9c981]/40 bg-[#e9c981]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f4dea8] backdrop-blur-md sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#e9c981]" />
                Scripture for everyday life
              </span>

              <h1 className="mt-7 font-serif text-[3.25rem] leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[5.25rem]">
                Meet the Word.
                <span className="mt-2 block font-normal italic text-[#e9c981]">
                  Live it daily.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:mt-7 sm:text-lg sm:leading-8">
                Make space for a more personal walk with God. Pray-Read brings
                scripture, reflection, and a faith-filled community into one
                thoughtful daily practice.
              </p>

              <div className="mt-8 flex flex-col gap-3.5 sm:mt-10 sm:flex-row sm:items-center">
                <AuthProtectedLink href="/bible-reader">
                  <span className="group inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-[#e9c981] px-8 text-base font-semibold text-[#163129] shadow-[0_16px_40px_-14px_rgba(233,201,129,0.85)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f2d99d] sm:w-auto">
                    Begin with scripture
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </AuthProtectedLink>
                <Link
                  href="/community"
                  className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/[0.08] px-7 text-base font-medium text-white backdrop-blur-md transition duration-300 hover:border-[#e9c981]/60 hover:bg-white/[0.14]"
                >
                  Find your community
                  <Users className="h-4 w-4 text-[#e9c981]" />
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-medium text-white/70 sm:mt-11 sm:text-sm">
                <span className="inline-flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-[#e9c981] ring-4 ring-[#e9c981]/20" />
                  Read with intention
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-white/35 sm:block" />
                <span className="inline-flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-[#e9c981] ring-4 ring-[#e9c981]/20" />
                  Reflect at your pace
                </span>
              </div>
            </motion.div>

            {/* Right Sanctuary Rhythm Card */}
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
              className="relative mx-auto w-full max-w-md lg:ml-auto"
            >
              {/* Outer Framing Rings */}
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[2.65rem] border border-[#e9c981]/20 bg-gradient-to-b from-white/[0.06] to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#e9c981]/15 blur-2xl"
              />

              <div className="relative overflow-hidden rounded-[2.15rem] border border-white/40 bg-[#f8f6ef] p-6 text-[#1d3029] shadow-[0_40px_100px_-35px_rgba(0,0,0,0.85)] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6d7e70]">
                      A simple rhythm
                    </p>
                    <h2 className="mt-2 font-serif text-2xl leading-snug text-[#17342c] sm:text-3xl">
                      Make room for meaning.
                    </h2>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dce3d4] bg-[#e9eddf] text-[#2c5746] shadow-inner">
                    <BookOpen className="h-5 w-5" />
                  </span>
                </div>

                <div className="relative mt-7 space-y-3">
                  <div
                    aria-hidden="true"
                    className="absolute bottom-8 left-[1.12rem] top-8 w-px bg-gradient-to-b from-[#cfd7c7] via-[#b8c4ae] to-[#cfd7c7]"
                  />
                  {[
                    {
                      number: "01",
                      title: "Read",
                      text: "Open a passage and take it in.",
                    },
                    {
                      number: "02",
                      title: "Reflect",
                      text: "Explore its meaning and context.",
                    },
                    {
                      number: "03",
                      title: "Respond",
                      text: "Carry the Word into your day.",
                    },
                  ].map((step) => (
                    <div
                      key={step.number}
                      className="group relative flex items-center gap-4 rounded-2xl border border-[#e4e5dc] bg-white/90 p-4 transition duration-200 hover:border-[#c6d1bf] hover:bg-white hover:shadow-[0_10px_25px_-18px_rgba(29,64,53,0.45)]"
                    >
                      <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d6e0d2] bg-[#f1f4ec] text-[11px] font-bold tracking-wider text-[#395b49] transition group-hover:border-[#395b49] group-hover:bg-[#1d4035] group-hover:text-[#e9c981]">
                        {step.number}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#1e372d]">
                          {step.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#6d786d]">
                          {step.text}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/bible-reader"
                  className="group mt-6 flex items-center justify-between rounded-2xl bg-[#1a3a30] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_30px_-15px_rgba(26,58,48,0.85)] transition hover:bg-[#244e41]"
                >
                  <span>Open the Bible reader</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-[#e9c981] group-hover:text-[#163129]">
                    <ArrowRight className="h-4 w-4 text-[#e9c981] transition-transform group-hover:translate-x-0.5 group-hover:text-[#163129]" />
                  </span>
                </Link>
              </div>

              {/* Floating Companion Badge */}
              <div className="absolute -bottom-5 -left-6 hidden items-center gap-3.5 rounded-2xl border border-white/20 bg-[#153229]/95 px-4 py-3 text-white shadow-[0_20px_45px_-15px_rgba(0,0,0,0.75)] backdrop-blur-md sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9c981]/15 text-[#e9c981]">
                  <Heart className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs font-semibold tracking-wide">
                    A daily practice
                  </span>
                  <span className="mt-0.5 block text-[10px] text-white/65">
                    Rooted in the living Word
                  </span>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Quick-Access Hero Pill Bar */}
          <div className="relative z-10 mx-auto max-w-7xl px-5 pb-9 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-white/15 pt-6 sm:justify-start sm:gap-3">
              <span className="mr-1 hidden text-xs font-medium uppercase tracking-[0.18em] text-white/45 lg:inline">
                Explore:
              </span>
              {[
                { icon: BookOpen, label: "Bible study", href: "/bible-reader" },
                { icon: MessageCircle, label: "Questions", href: "/qa" },
                { icon: Music2, label: "Verse-songs", href: "/verse-songs" },
                {
                  icon: Heart,
                  label: "Devotionals",
                  href: "/devotional-plans",
                },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:border-[#e9c981]/65 hover:bg-white/15 hover:text-white sm:text-sm"
                >
                  <Icon className="h-4 w-4 text-[#e9c981] transition-transform group-hover:scale-110" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================= PWA INSTALL BANNER ================= */}
        {installState !== "installed" && (
          <section className="bg-[#f8f6ef] px-5 pt-8 sm:px-8 sm:pt-10">
            <motion.button
              type="button"
              onClick={handleInstallClick}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="group mx-auto flex w-full max-w-6xl items-center gap-4 rounded-[1.5rem] border border-[#dce1d4] bg-white px-5 py-4 text-left shadow-[0_14px_40px_-28px_rgba(31,57,46,0.42)] transition hover:border-[#b9c6b2] hover:shadow-[0_18px_48px_-28px_rgba(31,57,46,0.5)] sm:px-7 sm:py-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e3e9dc] bg-[#eef2e8] text-[#2b5645] transition duration-300 group-hover:scale-105 group-hover:bg-[#1d4035] group-hover:text-[#e9c981]">
                <Smartphone className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-[#1f362c] sm:text-base">
                  {installState === "installing"
                    ? "Opening install options…"
                    : "Take Pray-Read with you"}
                  <span className="rounded-full border border-[#cde0cb] bg-[#e9f2e7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3d6946]">
                    Free app
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#6f796e] sm:text-sm">
                  Install for quick offline access and a distraction-free
                  reading experience.
                </span>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4f6ef] text-[#3a5c4a] transition group-hover:bg-[#e9c981] group-hover:text-[#17322a]">
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </span>
            </motion.button>
          </section>
        )}

        {/* ================= VERSE OF THE DAY ================= */}
        <VerseOfDay />

        {/* ================= DEVOTIONAL CALLOUT ================= */}
        <section className="bg-[#f8f6ef] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-[2.25rem] border border-[#d9dfd0] bg-[#e9eddf] p-7 shadow-[0_24px_60px_-42px_rgba(28,56,46,0.45)] sm:p-11 lg:p-14"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/40 blur-3xl"
              />
              <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-14">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4c634b]">
                    <CalendarDays className="h-3.5 w-3.5 text-[#2d5846]" />
                    Grow one day at a time
                  </span>
                  <h2 className="mt-4 font-serif text-3xl leading-[1.15] text-[#19352b] sm:text-4xl lg:text-[2.85rem]">
                    A little time in the Word can change the shape of your day.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-[#526253] sm:text-base">
                    Find a devotional journey for the season you are in, and
                    return to scripture with fresh intention each day.
                  </p>
                </div>

                <Link
                  href="/devotional-plans"
                  className="group inline-flex min-h-14 items-center justify-center gap-3 self-start rounded-full bg-[#1a3a30] px-7 text-sm font-semibold text-white shadow-[0_14px_34px_-16px_rgba(26,58,48,0.85)] transition hover:-translate-y-0.5 hover:bg-[#244e41] sm:px-8 lg:self-center"
                >
                  <CalendarDays className="h-5 w-5 text-[#e9c981]" />
                  <span>Explore devotional plans</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================= PERSONALIZED RECOMMENDATIONS ================= */}
        <div className="bg-[#f8f6ef] py-2">
          <RecommendedForYou />
        </div>

        {/* ================= 12 FEATURES SANCTUARY GRID ================= */}
        <section className="bg-[#f8f6ef] px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
              <span className="inline-block rounded-full border border-[#dce1d5] bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#5e6e5c]">
                Everything in one place
              </span>
              <h2 className="mt-4 font-serif text-4xl leading-[1.12] tracking-tight text-[#19352b] sm:text-5xl">
                A deeper way to engage with scripture
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#627063] sm:text-base">
                Read, study, pray, and connect with tools designed to support
                your faith journey.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {features.map(
                ({ icon: Icon, category, title, description, href }, index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{
                      duration: 0.45,
                      delay: Math.min(index % 3, 2) * 0.06,
                    }}
                  >
                    <Link
                      href={href}
                      className="group relative flex h-full min-h-[205px] flex-col overflow-hidden rounded-[1.75rem] border border-[#e3e4da] bg-white p-6 shadow-[0_14px_38px_-30px_rgba(31,57,46,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-[#b9c6b3] hover:shadow-[0_26px_50px_-30px_rgba(25,53,43,0.38)] sm:p-7"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#e9eddf]/0 transition-colors duration-300 group-hover:bg-[#e9eddf]/80"
                      />

                      <div className="relative flex items-center justify-between">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e2e8db] bg-[#eff3ea] text-[#2a5443] transition duration-300 group-hover:border-[#1d4035] group-hover:bg-[#1d4035] group-hover:text-[#e9c981]">
                          <Icon className="h-5 w-5" strokeWidth={1.85} />
                        </span>
                        <span className="rounded-full bg-[#f6f7f2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#788577]">
                          {category}
                        </span>
                      </div>

                      <div className="relative mt-6 flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-[#1d362c] transition-colors group-hover:text-[#12271f] sm:text-lg">
                          {title}
                        </h3>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#9aa493] transition duration-300 group-hover:translate-x-1 group-hover:text-[#1d4035]" />
                      </div>

                      <p className="relative mt-2 text-sm leading-6 text-[#6d786d]">
                        {description}
                      </p>
                    </Link>
                  </motion.div>
                )
              )}
            </div>

            <div className="mt-12 text-center sm:mt-16">
              <AuthProtectedLink href="/bible-reader">
                <span className="group inline-flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-full bg-[#1a3a30] px-8 text-sm font-semibold text-white shadow-[0_16px_38px_-18px_rgba(26,58,48,0.85)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#244e41] sm:text-base">
                  Explore Pray-Read Bible
                  <ArrowRight className="h-4 w-4 text-[#e9c981] transition-transform group-hover:translate-x-1" />
                </span>
              </AuthProtectedLink>
            </div>
          </div>
        </section>

        {/* ================= CLOSING COMMUNITY CTA ================= */}
        <section className="relative overflow-hidden border-t border-white/10 bg-[#132e26] px-5 py-16 text-white sm:px-8 sm:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full border border-[#e9c981]/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-20 h-80 w-80 rounded-full border border-white/[0.08]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-96 rounded-full bg-[#e9c981]/10 blur-3xl"
          />

          <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e9c981]/30 bg-[#e9c981]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e9c981]">
                Keep growing
              </span>
              <h2 className="mt-4 font-serif text-3xl leading-[1.15] sm:text-4xl lg:text-[2.75rem]">
                Let the Word meet you where you are.
              </h2>
              <p className="mt-3.5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                Start with a passage, follow a question, or find a community
                conversation that helps you keep exploring.
              </p>
            </div>

            <Link
              href="/community"
              className="group inline-flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-full bg-[#e9c981] px-8 text-sm font-semibold text-[#163129] shadow-[0_14px_35px_-14px_rgba(233,201,129,0.75)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f2d99d] sm:text-base"
            >
              <span>Join the community</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>

      <AppFooter />
    </>
  );
}
