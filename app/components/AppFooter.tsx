'use client';

import Link from 'next/link';
import VisitorMap from './VisitorMap';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Read Bible', href: '/bible-reader' },
  { label: 'Verse-Songs', href: '/verse-songs' },
  { label: 'Community', href: '/community' },
  { label: 'Contact', href: '/contact' },
];

const socialLinks = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/pneumafreedomexperience',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@pneumafreedomexperience',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    label: 'Twitter / X',
    href: 'https://twitter.com/pneumafreedom',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
];

export default function AppFooter() {
  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #07070d 0%, #050508 100%)',
        borderTop: '1px solid rgba(201,168,76,0.12)',
      }}
      className="relative overflow-hidden"
    >
      {/* Subtle gold glow top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.5) 50%, transparent 100%)' }}
      />

      {/* Ambient orb */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="lg:col-span-1 space-y-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <img src={LOGO} alt="Pray-Read Bible" className="h-12 w-auto" />
            </Link>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              A dual-language Bible platform bringing scripture to life for the modern believer — in English & Luganda.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-[#c9a84c] transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div className="space-y-4">
            <h4 className="text-white/80 text-xs font-semibold uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Create Account', href: '/signup' },
                { label: 'Read Bible', href: '/bible-reader' },
                { label: 'Verse-Songs', href: '/verse-songs' },
                { label: 'Reading Plans', href: '/reading-plans' },
                { label: 'Devotional Plans', href: '/devotional-plans' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/40 hover:text-[#c9a84c] text-sm transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ministry links */}
          <div className="space-y-4">
            <h4 className="text-white/80 text-xs font-semibold uppercase tracking-widest">Ministry</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Pneuma Experience', href: '/community/live-teaching' },
                { label: 'Community', href: '/community' },
                { label: 'Contact', href: '/contact' },
                { label: '♥ Donate', href: 'https://store.pesapal.com/donatetoprayreadbibleproject', external: true },
              ].map(l => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-[#c9a84c] text-sm transition-colors duration-200">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-white/40 hover:text-[#c9a84c] text-sm transition-colors duration-200">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Global Reach / Visitor Widget */}
          <div className="space-y-4">
            <h4 className="text-white/80 text-xs font-semibold uppercase tracking-widest">Global Reach</h4>
            <VisitorMap />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-8" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-xs text-white/30">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-white/60 transition-colors">About</Link>
            <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
            <span className="text-white/15">Privacy Policy</span>
          </div>
          <div className="text-xs text-white/25 text-center sm:text-right space-y-0.5">
            <p>© {new Date().getFullYear()} <span className="text-white/40">Pneuma Freedom Experience Ministry.</span> All rights reserved.</p>
            <p>Developed by{' '}
              <a href="https://ionhostingdigitalservice.com" target="_blank" rel="noopener noreferrer"
                className="text-[#c9a84c]/70 hover:text-[#c9a84c] transition-colors">
                Ion Hosting Digital Services
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
