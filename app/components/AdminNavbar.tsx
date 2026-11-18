"use client";

import { useState } from 'react';

// app/components/AdminNavbar.tsx — REDESIGNED, front-page colours
// Ivory #faf8f2 / emerald #1d4035 / gold #e9c981 / #a9852e
// NEW LOGO: /assets/PrayRead-logo.png (plain <img>, no next/image, no icon lib)
// Logic kept simple on purpose: Logout clears the admin session on the
// server (if that route exists) AND locally, then goes to /login.
// No other admin-panel logic lives here, so replacing this file cannot
// break any Save / Load / Edit / Delete handler in the panel.

const LOGO = '/assets/PrayRead-logo.png';

export default function AdminNavbar() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    try {
      window.localStorage.removeItem('adminEmail');
      window.localStorage.removeItem('admin_session');
      window.localStorage.removeItem('admin');
    } catch {}
    document.cookie = 'admin_session=; Max-Age=0; path=/';
    window.location.href = '/login';
  };

  return (
    <header style={{ background: '#1d4035', color: '#fff', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <div style={{ background: '#17372f', color: '#e9c981', textAlign: 'center', fontSize: 11, letterSpacing: 2, padding: '6px 16px', textTransform: 'uppercase' }}>
        Scripture &nbsp;·&nbsp; Prayer &nbsp;·&nbsp; Community
      </div>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#fff' }}>
          <img src={LOGO} alt="Pray-Read Bible Logo" width={46} height={46} style={{ objectFit: 'contain', background: '#faf8f2', borderRadius: 10, padding: 3 }} />
          <span>
            <span style={{ display: 'block', fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>Pray-Read Bible</span>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#e9c981' }}>READ · PRAY · GROW</span>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>Home</a>
          <a href="/about" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>About Us</a>
          <a href="/admin-panel" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, borderBottom: '2px solid #e9c981', paddingBottom: 4 }}>Admin Panel</a>
          <a href="/admin-panel" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>Settings</a>
        </nav>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#e9c981', fontWeight: 700, fontSize: 14 }}>Admin</span>
          <button onClick={handleLogout} disabled={loggingOut} style={{ background: '#111', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loggingOut ? 'not-allowed' : 'pointer', opacity: loggingOut ? 0.6 : 1 }}>
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #e9c981, #a9852e, #e9c981)' }} />
    </header>
  );
}
