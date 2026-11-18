"use client";

import { useState } from 'react';

// app/login/page.tsx — ADMIN LOGIN, MINIMAL BUILD-SAFE VERSION
// Why minimal? The previous page kept failing the Vercel build in 15-18s,
// even AFTER the login route was deleted — so the page itself was the
// build breaker. The risky imports were: ../store/authStore, next/image,
// lucide-react. This version imports NONE of them, so it cannot fail on
// a missing module. It still does the job:
//   POST /api/auth/login  ->  server sets admin_session cookie
//   ->  window.location.href = '/admin-panel'
// The cookie is what the admin panel + update-password actually read.
// The old setAdmin() call only set client-side state — it was never what
// kept you logged in. Removing it does NOT log you out.
// Colours: front page ivory #faf8f2, emerald #1d4035, gold #e9c981 / #a9852e.
// No demo-credentials box. No visitor map. No icon library. No Image component.

const LOGO = '/assets/PrayRead-logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@prayread.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { setError('Enter your email and password.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const raw = await response.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { data = { success: false, message: 'Server returned ' + response.status + ' (not JSON).' }; }
      if (data.success && data.admin) {
        try { window.localStorage.setItem('adminEmail', data.admin.email || cleanEmail); } catch {}
        window.location.href = '/admin-panel';
      } else {
        setError(data.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#faf8f2', color: '#22382f', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#1d4035', color: '#e9c981', textAlign: 'center', fontSize: 11, letterSpacing: 2, padding: '8px 16px', textTransform: 'uppercase' }}>Scripture · Prayer · Community</header>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px', height: 80 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#1d4035' }}>
          <img src={LOGO} alt="Pray-Read Bible Logo" width={44} height={44} style={{ objectFit: 'contain' }} />
          <span><span style={{ display: 'block', fontSize: 19, fontWeight: 800 }}>Pray-Read Bible</span><span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#a9852e' }}>READ · PRAY · GROW</span></span>
        </a>
        <nav style={{ display: 'flex', gap: 32 }}>
          <a href="/" style={{ color: '#5a6a61', textDecoration: 'none' }}>Home</a>
          <a href="/about" style={{ color: '#5a6a61', textDecoration: 'none' }}>About Us</a>
          <a href="/verse-songs" style={{ color: '#5a6a61', textDecoration: 'none' }}>Verse-Songs</a>
        </nav>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" style={{ background: '#e9a319', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Donate</a>
          <span style={{ color: '#1d4035', fontWeight: 700, borderBottom: '2px solid #e9c981' }}>Log In</span>
          <a href="/signup" style={{ background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign Up</a>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 448, background: '#fff', border: '1px solid #ece4d0', borderRadius: 16, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src={LOGO} alt="Pray-Read Bible" width={80} height={80} style={{ objectFit: 'contain', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 30, fontWeight: 800, color: '#1d4035', margin: '0 0 8px' }}>Admin Login</h2>
            <p style={{ color: '#5a6a61', margin: 0 }}>Sign in to access the admin panel.</p>
          </div>

          {error && (<div style={{ marginBottom: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#b91c1c', fontSize: 14 }}>{error}</div>)}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Email Address</label>
              <input type="email" id="email" placeholder="admin@prayread.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', background: '#faf8f2', border: '1px solid #e5dcc3', borderRadius: 12, fontSize: 15, outline: 'none' }} />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 48px 12px 16px', background: '#faf8f2', border: '1px solid #e5dcc3', borderRadius: 12, fontSize: 15, outline: 'none' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5a6a61', fontSize: 13, fontWeight: 700 }}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}>{isLoading ? 'Signing in…' : 'Sign In →'}</button>
            <div style={{ textAlign: 'center' }}><a href="/forgot-password" style={{ fontSize: 14, color: '#a9852e' }}>Forgot your password?</a></div>
          </form>
        </div>
      </main>

      <footer style={{ background: '#1d4035', color: 'rgba(233,201,129,0.8)', padding: '24px', textAlign: 'center', fontSize: 12 }}>© 2026 Pneuma Freedom Experience Ministry. All rights reserved.</footer>
    </div>
  );
}
