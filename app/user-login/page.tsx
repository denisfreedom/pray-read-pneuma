"use client";
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Eye, EyeOff, Heart, ShieldCheck, Sparkles } from 'lucide-react';

// app/user-login/page.tsx — REDESIGNED to match the web app (ivory + emerald + gold)
// BUGS FIXED vs old file:
// 1) React.FormEvent used without importing React -> now `type FormEvent` imported. Build-safe.
// 2) Blue -> purple -> pink gradient + blue buttons did NOT match the app -> ivory + emerald + gold.
// 3) After login the front page still showed "Get started" because nothing saved userEmail ->
//    now saves localStorage userEmail + userName on success (front page reads userEmail).
// 4) Open-redirect: redirect=//evil.com or redirect=/user-login?x could bounce users off-site ->
//    now only allows same-site paths starting with a single / and not an auth page.
// 5) No show/hide password, no header/nav, logo loaded from external CDN only ->
//    added show/hide, same header as front page + signup, local logo with CDN fallback.
// 6) window/localStorage accessed without guards -> guarded. window.location.replace replaced
//    with router.replace + safety-net hard navigate.

const LOGO = '/assets/PrayRead-logo.png';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';
const LANDSCAPE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=85&w=1600&auto=format&fit=crop';

function safeRedirect(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  const authPages = ['/user-login', '/signup', '/login', '/user-forgot-password', '/forgot-password'];
  if (authPages.some((p) => raw === p || raw.startsWith(p + '?') || raw.startsWith(p + '/'))) return '/dashboard';
  return raw;
}

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg) setMessage(msg);
    // Pre-fill email if the user just signed up / was remembered
    try { const saved = window.localStorage.getItem('userEmail'); if (saved) setEmail(saved); } catch {}
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Enter a valid email address.'); setLoading(false); return; }
    if (!password) { setError('Enter your password.'); setLoading(false); return; }
    try {
      const response = await fetch('/api/auth/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const raw = await response.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { data = { success: false, message: `Server returned ${response.status} (not JSON). ${raw.slice(0, 120)}` }; }
      if (!response.ok || !data.success) {
        setError(data.message || `Login failed (HTTP ${response.status}). Please try again.`);
        return;
      }
      // FIX: persist login identity so header/dashboard recognise the user immediately
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('userEmail', cleanEmail);
          const name = data?.user?.name || data?.user?.fullName || '';
          if (name) window.localStorage.setItem('userName', String(name));
        }
      } catch {}
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const safe = safeRedirect(params.get('redirect'));
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (isInIframe) {
        try { window.parent.postMessage({ type: 'AUTH_SUCCESS', redirect: safe, user: data.user }, '*'); } catch {}
      }
      try { router.replace(safe); } catch { window.location.replace(safe); }
      setTimeout(() => { if (typeof window !== 'undefined' && window.location.pathname === '/user-login') window.location.replace(safe); }, 1500);
    } catch (err: any) {
      setError('Could not reach the server. Check your connection and try again. (' + (err?.message || 'network error') + ')');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f2] text-[#22382f] antialiased lg:h-screen lg:overflow-hidden">
      <div className="bg-[#1d4035] text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#e9c981] py-2 px-4">Scripture &nbsp;·&nbsp; Prayer &nbsp;·&nbsp; Community</div>
      <header className="sticky top-0 z-40 border-b border-[#ece4d0] bg-[#faf8f2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#e9c981] bg-white shadow-sm sm:h-12 sm:w-12"><Image src={logoSrc} alt="Pray-Read Bible Logo" width={48} height={48} priority className="object-contain" onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} /></span>
            <span className="leading-none"><span className="block font-serif text-lg font-bold text-[#1d4035] sm:text-xl">Pray-Read <span className="text-[#a9852e]">Bible</span></span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a927f]">Meet the Word · Live it daily</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/" className="rounded-full px-3 py-2 text-sm font-medium text-[#3d5247] transition hover:bg-[#efe9d8] hover:text-[#1d4035]">Home</Link>
            <Link href="/about" className="rounded-full px-3 py-2 text-sm font-medium text-[#3d5247] transition hover:bg-[#efe9d8] hover:text-[#1d4035]">About</Link>
            <Link href="/verse-songs" className="rounded-full px-3 py-2 text-sm font-medium text-[#3d5247] transition hover:bg-[#efe9d8] hover:text-[#1d4035]">Verse-Songs</Link>
            <Link href="/prayer-library" className="rounded-full border border-[#e9c981]/70 bg-[#fdf6e3] px-4 py-2 text-sm font-semibold text-[#1d4035] transition hover:bg-[#f5ead0]">🙏 Prayer Library</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#1d4035]/20 px-4 py-2 text-sm font-medium text-[#1d4035] transition hover:bg-white"><Heart className="h-4 w-4 text-[#a9852e]" /> Donate</a>
            <Link href="/signup" className="rounded-full bg-[#1d4035] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#285445]">Sign Up</Link>
          </div>
          <button type="button" aria-label="Toggle menu" className="rounded-full border border-[#e8dfc8] bg-white px-3 py-2 text-[#1d4035] md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
        </div>
        {mobileMenuOpen && (<nav className="border-t border-[#ece4d0] bg-white px-5 py-4 md:hidden"><Link href="/" className="block rounded-xl px-4 py-3 text-[#3d5247] hover:bg-[#faf8f2]">Home</Link><Link href="/about" className="block rounded-xl px-4 py-3 text-[#3d5247] hover:bg-[#faf8f2]">About Us</Link><Link href="/verse-songs" className="block rounded-xl px-4 py-3 text-[#3d5247] hover:bg-[#faf8f2]">Verse-Songs</Link><Link href="/prayer-library" className="block rounded-xl px-4 py-3 font-semibold text-[#1d4035] hover:bg-[#fdf6e3]">🙏 Prayer Library</Link><Link href="/signup" className="mt-2 block rounded-full bg-[#1d4035] px-4 py-3 text-center font-semibold text-white">Create Account</Link></nav>)}
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-5 py-5 sm:px-8 lg:min-h-0 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:py-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#1d4035] text-white shadow-[0_30px_70px_-30px_rgba(29,64,53,0.6)]">
          <div className="relative h-56 sm:h-64 lg:h-full lg:min-h-0"><Image src={LANDSCAPE} alt="Mountains at sunrise" width={1200} height={800} className="h-full w-full object-cover" priority /><div className="absolute inset-0 bg-gradient-to-t from-[#1d4035] via-[#1d4035]/55 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 sm:p-7"><p className="inline-flex items-center gap-2 rounded-full border border-[#e9c981]/40 bg-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e9c981]"><Sparkles className="h-3.5 w-3.5" /> Welcome back</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">Continue your<br />journey in the Word.</h2><p className="mt-3 max-w-md text-sm leading-7 text-white/80">Pick up where you left off — your plans, notes, prayers, and verse-songs are waiting for you.</p><div className="mt-4 space-y-2 text-sm"><p className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9c981]/15 text-[#e9c981]"><BookOpen className="h-4 w-4" /></span> Your devotional plans &amp; reading progress</p><p className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9c981]/15 text-[#e9c981]"><Heart className="h-4 w-4" /></span> Prayer Library &amp; verse notes</p><p className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9c981]/15 text-[#e9c981]"><ShieldCheck className="h-4 w-4" /></span> Your account, kept private &amp; secure</p></div></div></div>
        </section>

        <section className="flex flex-col justify-center rounded-[2rem] border border-[#e8dfc8] bg-white p-6 shadow-[0_24px_60px_-30px_rgba(29,64,53,0.25)] sm:p-7 lg:min-h-0 lg:overflow-y-auto">
          <div className="text-center sm:text-left"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a9852e]">Welcome back</p><h1 className="mt-3 font-serif text-3xl text-[#1d4035] sm:text-4xl">Sign In to Community</h1><p className="mt-2 text-sm leading-6 text-[#6b7a6e]">Welcome back! Continue your spiritual journey.</p></div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {message && <div role="status" className="rounded-2xl border border-[#d8e8d5] bg-[#eef3ea] px-4 py-3 text-sm text-[#2f5a3a]">{message}</div>}
            {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#1d4035]">Email Address</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-2xl border border-[#e8dfc8] bg-[#faf8f2] px-4 py-3.5 text-sm text-[#22382f] outline-none transition placeholder:text-[#a0a99c] focus:border-[#a9852e] focus:bg-white focus:ring-2 focus:ring-[#e9c981]/50" placeholder="john@example.com" disabled={loading} /></div>
            <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="block text-sm font-semibold text-[#1d4035]">Password</label><Link href="/user-forgot-password" className="text-xs font-semibold text-[#a9852e] hover:underline">Forgot Password?</Link></div><div className="relative"><input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="w-full rounded-2xl border border-[#e8dfc8] bg-[#faf8f2] px-4 py-3.5 pr-12 text-sm text-[#22382f] outline-none transition placeholder:text-[#a0a99c] focus:border-[#a9852e] focus:bg-white focus:ring-2 focus:ring-[#e9c981]/50" placeholder="••••••••" disabled={loading} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#6b7a6e] hover:bg-[#efe9d8]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <button type="submit" disabled={loading} className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1d4035] px-7 text-base font-semibold text-white shadow-[0_16px_35px_-18px_rgba(29,64,53,0.6)] transition hover:bg-[#285445] disabled:opacity-50">{loading ? 'Signing In…' : <>Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}</button>
          </form>
          <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e8dfc8]"></div></div><div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-[#8a927f]">New to the community?</span></div></div>
          <Link href="/signup" className="flex min-h-12 items-center justify-center rounded-full border border-[#1d4035]/25 bg-white px-6 text-sm font-semibold text-[#1d4035] transition hover:border-[#a9852e] hover:bg-[#fdf6e3]">Create Account</Link>
          <p className="mt-4 text-center text-xs leading-5 text-[#8a927f]">Trouble signing in? <Link href="/user-forgot-password" className="font-semibold text-[#1d4035] underline">Reset your password</Link> or <Link href="/signup" className="font-semibold text-[#1d4035] underline">create a new account</Link>.</p>
          <p className="mt-4 text-center text-[11px] text-[#8a927f]">&copy; 2026 Pneuma Freedom Experience Ministry</p>
        </section>
      </main>
    </div>
  );
}
