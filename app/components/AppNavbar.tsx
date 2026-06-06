'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/verse-songs', label: 'Verse-Songs' },
  { href: '/community', label: 'Community' },
  { href: '/qa', label: 'Q&A' },
];

export default function AppNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(8,8,14,0.92)' : 'rgba(8,8,14,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.04)',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="relative w-9 h-9 sm:w-11 sm:h-11">
            <Image src={LOGO} alt="Pray-Read Bible" fill className="object-contain drop-shadow-lg" />
          </div>
          <span className="hidden sm:inline text-white font-semibold text-sm sm:text-base tracking-wide whitespace-nowrap">
            Pray-Read <span className="text-amber-400">Bible</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-0.5 lg:gap-1 flex-1 justify-center mx-2">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`relative px-1.5 sm:px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium rounded-lg transition-all duration-200 group whitespace-nowrap ${
                isActive(href)
                  ? 'text-amber-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
              {isActive(href) && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-amber-400 rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <a
            href="https://store.pesapal.com/donatetoprayreadbibleproject"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 transition-all whitespace-nowrap"
          >
            ♥ Donate
          </a>
          <Link
            href="/user-login"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            Sign Up
          </Link>
        </div>
        
        {/* Medium screen - just signup */}
        <div className="hidden md:flex lg:hidden items-center gap-2 flex-shrink-0">
          <Link
            href="/signup"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 text-white"
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-4 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2 w-6' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="sm:hidden border-t relative z-50"
          style={{ background: 'rgba(8,8,14,0.98)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <nav className="px-3 py-3 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-400/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="px-3 pb-4 pt-2 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <a
              href="https://store.pesapal.com/donatetoprayreadbibleproject"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2.5 rounded-lg text-sm font-medium border border-amber-400/30 text-amber-300"
            >
              ♥ Donate
            </a>
            <Link href="/user-login" className="block text-center py-2.5 rounded-lg text-sm font-medium bg-white/5 text-white/70">
              Log In
            </Link>
            <Link
              href="/signup"
              className="block text-center py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
