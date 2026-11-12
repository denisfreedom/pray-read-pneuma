"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// app/components/AppNavbar.tsx — REDESIGNED TO BEST
// Fixes:
// 1) Logo: was outside CDN (app-cdn.appgen.com) -> now local public/assets/PrayRead-logo.png
//    URL = /assets/PrayRead-logo.png. Falls back to CDN once if local file is missing.
// 2) Theme: was pure black #08080E -> now navy #0F2043 + gold #E7C873, matching footer + app.
// 3) Nav was missing core pages -> now: Home, Read Bible, Devotionals, Verse-Songs, Verse of the Day, Community, Q&A
//    All interconnected with footer (same hrefs).
// 4) Mobile menu: was instant show/hide -> now animated, closes on route change, closes on Escape, locks scroll.
// 5) Active state: was tiny underline -> now gold pill background, clear on mobile + desktop.
// 6) Logo + wordmark: logo image + "Pray-Read Bible" + tiny "PNEUMA" tagline, no squish on mobile.

const LOGO_LOCAL = '/assets/PrayRead-logo.png';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/bible-reader', label: 'Read Bible' },
  { href: '/devotional-plans', label: 'Devotionals' },
  { href: '/verse-of-the-day', label: 'Verse of the Day' },
  { href: '/verse-songs', label: 'Verse-Songs' },
  { href: '/about', label: 'About Us' },
  { href: '/community', label: 'Community' },
  { href: '/qa', label: 'Q&A' },
];
// First 5 show on desktop bar, all 8 show in mobile menu (see below).

export default function AppNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO_LOCAL);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change + Escape + lock body scroll while open
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const desktopLinks = navLinks.slice(0, 5);

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(15,32,67,0.96)' : 'rgba(15,32,67,0.88)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '2px solid #E7C873',
        boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.35)' : '0 2px 16px rgba(0,0,0,0.2)',
      }}>
      {/* Gold glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(231,200,115,0.7), transparent)' }} />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-[68px] flex items-center justify-between gap-2">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group" aria-label="Pray-Read Bible — Home">
          <span className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shrink-0"
            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E7C873', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Pray-Read Bible" width={44} height={44} className="w-10 h-10 sm:w-11 sm:h-11 object-contain"
              onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} />
          </span>
          <span className="leading-none">
            <span className="block text-white font-bold text-[15px] sm:text-[17px] tracking-wide whitespace-nowrap">
              Pray-Read <span className="text-[#E7C873]">Bible</span>
            </span>
            <span className="hidden sm:block text-[10px] tracking-[0.22em] text-white/50 font-semibold mt-1">ENCOUNTER THE LIVING WORD</span>
          </span>
        </Link>

        {/* Desktop Nav — first 5 links, rest in "More" via Community/Q&A in mobile */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center mx-2" aria-label="Main navigation">
          {desktopLinks.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-3 py-2 text-[13px] xl:text-sm font-semibold rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive(href) ? 'bg-[#E7C873] text-[#0F2043] shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}>{label}</Link>
          ))}
          {/* More — About / Community / Q&A live here so desktop stays clean */}
          <div className="relative group">
            <button className="px-3 py-2 text-[13px] xl:text-sm font-semibold rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all">More ▾</button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="bg-[#0F2043] border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[180px]">
                {navLinks.slice(5).map(({ href, label }) => (
                  <Link key={href} href={href} className={`block px-4 py-2.5 rounded-xl text-sm font-medium ${isActive(href) ? 'bg-[#E7C873] text-[#0F2043]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>{label}</Link>
                ))}
                <div className="h-px bg-white/10 my-1" />
                <Link href="/reading-plans" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10">Reading Plans</Link>
                <Link href="/dashboard" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10">Dashboard</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-full text-xs font-bold border border-[#E7C873]/60 text-[#E7C873] hover:bg-[#E7C873] hover:text-[#0F2043] transition-all whitespace-nowrap">♥ Donate</a>
          <Link href="/user-login" className="px-3.5 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">Log In</Link>
          <Link href="/signup" className="px-4 py-2 rounded-full text-xs font-bold bg-[#E7C873] text-[#0F2043] hover:bg-white transition-all shadow-lg whitespace-nowrap">Sign Up</Link>
        </div>

        {/* Tablet — just Sign Up */}
        <div className="hidden md:flex lg:hidden items-center flex-shrink-0">
          <Link href="/signup" className="px-4 py-2 rounded-full text-xs font-bold bg-[#E7C873] text-[#0F2043] hover:bg-white transition-all whitespace-nowrap">Sign Up</Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}
          className="md:hidden flex flex-col gap-1.5 p-2.5 rounded-xl hover:bg-white/10 transition-colors">
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu — animated */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ background: 'rgba(10,22,46,0.98)', borderTop: mobileOpen ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
        <nav className="px-4 py-4 space-y-1 max-h-[52vh] overflow-y-auto" aria-label="Mobile navigation">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`flex items-center justify-between py-3 px-4 rounded-xl text-[15px] font-semibold transition-colors ${
                isActive(href) ? 'bg-[#E7C873] text-[#0F2043]' : 'text-white/75 hover:text-white hover:bg-white/5'
              }`}>{label}<span className="text-xs opacity-60">→</span></Link>
          ))}
          <Link href="/reading-plans" className="flex items-center justify-between py-3 px-4 rounded-xl text-[15px] font-semibold text-white/75 hover:text-white hover:bg-white/5">Reading Plans<span className="text-xs opacity-60">→</span></Link>
          <Link href="/dashboard" className="flex items-center justify-between py-3 px-4 rounded-xl text-[15px] font-semibold text-white/75 hover:text-white hover:bg-white/5">Dashboard<span className="text-xs opacity-60">→</span></Link>
        </nav>
        <div className="px-4 pb-5 pt-1 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer"
            className="block text-center py-3 rounded-xl text-sm font-bold border border-[#E7C873]/50 text-[#E7C873]">♥ Donate to the Project</a>
          <Link href="/user-login" className="block text-center py-3 rounded-xl text-sm font-semibold bg-white/5 text-white/80">Log In</Link>
          <Link href="/signup" className="block text-center py-3 rounded-xl text-sm font-bold bg-[#E7C873] text-[#0F2043]">Sign Up — Free</Link>
          <p className="text-center text-[11px] text-white/35 pt-1">Pneuma Freedom Experience Ministry • prayreadbible.org</p>
        </div>
      </div>
    </header>
  );
}
