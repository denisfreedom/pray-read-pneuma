"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VisitorMap from '../components/VisitorMap';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

export default function SignupPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loginHref, setLoginHref] = useState('/user-login');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg) setMessage(msg);
    const redirect = params.get('redirect');
    if (redirect) setLoginHref(`/user-login?redirect=${encodeURIComponent(redirect)}&message=Please+sign+in+to+access+this+feature`);
  }, []);

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    // Client-side checks so the server is never hit with obviously bad data
    if (!name) { setError('Full name is required.'); setLoading(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); setLoading(false); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      // FIX: old code did `await response.json()` directly. If the API 500s and returns HTML,
      // that throws and the user only sees "An error occurred". Read as text first, then parse.
      const raw = await response.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { data = { success: false, message: `Server returned ${response.status} (not JSON). ${raw.slice(0, 120)}` }; }
      if (!response.ok || !data.success) {
        // 409 = email already exists -> send them to Sign In, don't leave them stuck
        if (response.status === 409) {
          setError(data.message || 'An account with this email already exists. Please Sign In instead.');
        } else {
          setError(data.message || `Signup failed (HTTP ${response.status}). Please try again.`);
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      const params = new URLSearchParams(window.location.search);
      const rawRedirect = params.get('redirect') || '/dashboard';
      const safeRedirect = (rawRedirect === '/user-login' || rawRedirect === '/signup' || rawRedirect === '/login') ? '/dashboard' : rawRedirect;
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        try { window.parent.postMessage({ type: 'AUTH_SUCCESS', redirect: safeRedirect, user: data.user }, '*'); } catch (_) {}
      }
      window.location.replace(safeRedirect);
    } catch (err: any) {
      // Network failure (offline / CORS / server down) — say so, don't hide it
      setError('Could not reach the server. Check your connection and try again. (' + (err?.message || 'network error') + ')');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-stone-50 text-stone-800 font-sans selection:bg-gold-500/20 selection:text-gold-700 antialiased flex flex-col min-h-screen">
      <style jsx global>{`
        .glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active { -webkit-box-shadow: 0 0 0 30px white inset !important; }
      `}</style>
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3"><img src={LOGO} alt="Pray-Read Bible Logo" className="h-14 w-auto" /></Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-stone-500 hover:text-stone-900">Home</Link>
            <Link href="/about" className="text-stone-500 hover:text-stone-900">About Us</Link>
            <Link href="/verse-songs" className="text-stone-500 hover:text-stone-900">Verse-Songs</Link>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-medium">Donate</a>
            <button className="px-5 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium ring-2 ring-stone-900 ring-offset-2">Sign Up</button>
          </div>
          <button className="md:hidden text-stone-800 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
        </div>
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white border-t border-stone-200 shadow-lg`}>
          <nav className="px-6 py-4 space-y-3">
            <Link href="/" className="block py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg">Home</Link>
            <Link href="/about" className="block py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg">About Us</Link>
            <Link href="/verse-songs" className="block py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg">Verse-Songs</Link>
          </nav>
        </div>
      </header>
      <main className="flex-grow pt-20 flex items-center justify-center relative px-4 py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/90 via-purple-600/90 to-pink-500/90"></div>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-100 p-8 md:p-10 relative z-10">
          <div className="text-center mb-8">
            <img src={LOGO} alt="Pray-Read Bible" className="h-20 w-auto mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-stone-900 mb-2">Join the Community</h2>
            <p className="text-stone-500">Create a free account to access the Bible, Q&amp;A, Devotionals, and all features.</p>
          </div>
          <form className="space-y-5" onSubmit={handleSignupSubmit}>
            {message && <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">{message}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-stone-700">Full Name</label>
              <input type="text" id="name" name="name" placeholder="John Doe" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email Address</label>
              <input type="email" id="email" name="email" placeholder="john@example.com" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-stone-700">Password</label>
              <input type="password" id="password" name="password" placeholder="••••••••" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none" required disabled={loading} />
              <p className="text-xs text-stone-400">At least 6 characters.</p>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-100"><p className="text-xs text-stone-500 leading-relaxed">By creating an account, you will have <strong className="text-stone-700">Frontend User</strong> access, allowing you to read scripture and use offline features.</p></div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-stone-900 text-white rounded-xl font-medium disabled:opacity-50">{loading ? 'Creating Account...' : 'Sign Up →'}</button>
          </form>
          <div className="relative my-8"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-stone-400">Already a member?</span></div></div>
          <div className="text-center"><Link href={loginHref} className="w-full py-3.5 border border-stone-200 text-stone-700 rounded-xl block">Sign In to Community</Link></div>
        </div>
      </main>
      <footer className="bg-stone-950 text-stone-400 py-16 relative z-20"><div className="max-w-7xl mx-auto px-6"><p className="text-xs">&copy; 2026 Pneuma Freedom Experience Ministry. All rights reserved.</p><VisitorMap /></div></footer>
    </div>
  );
}
