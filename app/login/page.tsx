"use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Heart, Mail, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// app/login/page.tsx — ADMIN LOGIN (your file, fixed)
// KEPT exactly as you had it: posts to /api/auth/login, setAdmin(data.admin),
// window.location.href = '/admin-panel'.
// FIXED:
//  1) REMOVED VisitorMap — it called /api/live-stats (404) and broke first load.
//  2) REMOVED "Demo Admin Credentials: admin123" box — it published your
//     admin password to everyone on the internet.
//  3) Colours now match the front page: ivory #faf8f2, emerald #1d4035,
//     gold #e9c981 / #a9852e. Old file used Tailwind gold-500 / gold-600 /
//     gold-700 which DO NOT EXIST, so buttons fell back to unstyled.
//  4) Logo now local /assets/PrayRead-logo.png with CDN fallback (old file
//     only used the CDN, so a CDN failure = no logo).
//  5) Phosphor <i class="ph ..."> icons need an external CDN that 404s —
//     replaced with lucide-react icons (already in your project).
//  6) response.json() would crash if the server returned HTML/500 — now
//     reads text first, parses safely, and shows the REAL server message.
//  7) Email pre-filled + trimmed/lowercased, show/hide password added.

const LOGO = '/assets/PrayRead-logo.png';
const LOGO_FALLBACK = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

export default function LoginPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('admin@prayread.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO);
  const setAdmin = useAuthStore(state => state.setAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(cleanEmail)) { setError('Enter a valid email address.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const raw = await response.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { data = { success: false, message: `Server returned ${response.status} (not JSON).` }; }
      if (data.success && data.admin) {
        setAdmin(data.admin);
        window.location.href = '/admin-panel';
      } else {
        setError(data.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#faf8f2] text-[#22382f] font-sans antialiased flex flex-col min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#faf8f2]/90 backdrop-blur-md border-b border-[#ece4d0]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#e9c981] bg-white shadow-sm"><Image src={logoSrc} alt="Pray-Read Bible Logo" width={44} height={44} className="object-contain" onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} /></span>
            <span className="leading-none"><span className="block text-[19px] font-extrabold tracking-tight text-[#1d4035]">Pray-Read Bible</span><span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a9852e]">Read · Pray · Grow</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/')} className="text-[#5a6a61] hover:text-[#1d4035] transition-colors">Home</button>
            <button onClick={() => router.push('/about')} className="text-[#5a6a61] hover:text-[#1d4035] transition-colors">About Us</button>
            <button onClick={() => router.push('/verse-songs')} className="text-[#5a6a61] hover:text-[#1d4035] transition-colors">Verse-Songs</button>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#e9a319] text-white rounded-lg hover:bg-[#d18f0e] transition-all shadow-md text-sm font-medium flex items-center gap-2"><Heart size={16} /> Donate</a>
            <button className="text-[#1d4035] font-medium cursor-default border-b-2 border-[#e9c981] pb-0.5">Log In</button>
            <button onClick={() => router.push('/signup')} className="px-5 py-2.5 bg-[#111111] text-white rounded-lg hover:bg-black transition-all shadow-md text-sm font-medium">Sign Up</button>
          </div>
          <button className="md:hidden text-[#22382f] p-2 font-bold" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>Menu</button>
        </div>
        <div className={`${mobileMenuOpen ? '' : 'hidden'} md:hidden bg-white border-t border-[#ece4d0] shadow-lg`}>
          <nav className="px-6 py-4 space-y-3">
            <button onClick={() => router.push('/')} className="block w-full text-left py-3 px-4 text-[#22382f] hover:bg-[#faf8f2] rounded-lg">Home</button>
            <button onClick={() => router.push('/about')} className="block w-full text-left py-3 px-4 text-[#22382f] hover:bg-[#faf8f2] rounded-lg">About Us</button>
            <button onClick={() => router.push('/verse-songs')} className="block w-full text-left py-3 px-4 text-[#22382f] hover:bg-[#faf8f2] rounded-lg">Verse-Songs</button>
            <div className="border-t border-[#ece4d0] pt-3 space-y-3">
              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 px-4 bg-[#e9a319] text-white rounded-lg font-medium">Donate</a>
              <button onClick={() => router.push('/login')} className="block w-full text-center py-3 px-4 text-[#1d4035] font-medium bg-[#e9c981]/30 rounded-lg">Log In</button>
              <button onClick={() => router.push('/signup')} className="block w-full text-center py-3 px-4 bg-[#111111] text-white rounded-lg font-medium">Sign Up</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-20 flex items-center justify-center relative px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-[#ece4d0] border border-[#ece4d0] p-8 md:p-10 relative z-10">
          <div className="text-center mb-10">
            <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#e9c981] bg-white shadow-sm"><Image src={logoSrc} alt="Pray-Read Bible" width={80} height={80} className="object-contain" onError={() => { if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK); }} /></span>
            <h2 className="text-3xl font-bold text-[#1d4035] mb-2">Admin Login</h2>
            <p className="text-[#5a6a61]">Sign in to access the admin panel.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertTriangle size={18} />{error}</div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#22382f]">Email Address</label>
              <div className="relative">
                <input type="email" id="email" placeholder="admin@prayread.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#faf8f2] border border-[#e5dcc3] rounded-xl focus:border-[#1d4035] focus:ring-2 focus:ring-[#e9c981] outline-none transition-all placeholder:text-[#9aa89f] text-[#22382f]" required disabled={isLoading} />
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa89f]" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#22382f]">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-3 bg-[#faf8f2] border border-[#e5dcc3] rounded-xl focus:border-[#1d4035] focus:ring-2 focus:ring-[#e9c981] outline-none transition-all placeholder:text-[#9aa89f] text-[#22382f]" required disabled={isLoading} />
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa89f]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a61]" aria-label="Show or hide password">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-[#111111] text-white rounded-xl hover:bg-black transition-all shadow-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              {!isLoading && <ArrowRight size={18} />}
            </button>
            <div className="text-center"><Link href="/forgot-password" className="text-sm text-[#a9852e] hover:underline">Forgot your password?</Link></div>
          </form>
          {/* No demo credentials box on purpose — never publish a real password on a login page. */}
        </div>
      </main>

      <footer className="bg-[#1d4035] text-[#e9c981]/80 py-10 border-t border-[#1d4035]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; 2026 Pneuma Freedom Experience Ministry. All rights reserved.</p>
          <p>Developed by <span className="text-[#e9c981] font-medium">Ion Hosting Digital Services</span></p>
        </div>
      </footer>
    </div>
  );
}
