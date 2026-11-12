"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg) setMessage(msg);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const response = await fetch('/api/auth/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      // FIX: old code did `await response.json()` directly. If the API 500s and returns HTML,
      // that throws and the user only sees "An error occurred". Read as text first, then parse.
      const raw = await response.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { data = { success: false, message: `Server returned ${response.status} (not JSON). ${raw.slice(0, 120)}` }; }
      if (!response.ok || !data.success) {
        setError(data.message || `Login failed (HTTP ${response.status}). Please try again.`);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const rawRedirect = params.get('redirect') || '/dashboard';
      const authPages = ['/user-login', '/signup', '/login', '/user-forgot-password', '/forgot-password'];
      const safeRedirect = authPages.some((p) => rawRedirect.startsWith(p)) ? '/dashboard' : rawRedirect;
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        try { window.parent.postMessage({ type: 'AUTH_SUCCESS', redirect: safeRedirect, user: data.user }, '*'); } catch (_) {}
      }
      window.location.replace(safeRedirect);
    } catch (err: any) {
      setError('Could not reach the server. Check your connection and try again. (' + (err?.message || 'network error') + ')');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex justify-center mb-6">
          <Image src="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png" alt="Pray-Read Bible Logo" width={80} height={80} className="object-contain drop-shadow-lg" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Sign In to Community</h1>
        <p className="text-center text-gray-600 mb-8">Welcome back! Continue your spiritual journey.</p>
        {message && <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg text-sm">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
          </div>
          <div className="text-right"><button type="button" onClick={() => router.push('/user-forgot-password')} className="text-sm text-blue-600 hover:underline">Forgot Password?</button></div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Signing In...' : 'Sign In →'}</button>
        </form>
        <div className="mt-6 text-center"><p className="text-gray-600">New to the community? <button onClick={() => router.push('/signup')} className="text-blue-600 font-semibold hover:underline">Create Account</button></p></div>
      </div>
    </div>
  );
}
