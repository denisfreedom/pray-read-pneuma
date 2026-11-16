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
