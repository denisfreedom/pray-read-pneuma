'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="bg-stone-50 flex flex-col min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-100 p-10 text-center">
          <i className="ph ph-warning-circle text-5xl text-red-400 mb-4 block"></i>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Invalid Reset Link</h2>
          <p className="text-stone-500 mb-6">This password reset link is invalid or has expired. Please request a new one.</p>
          <Link href="/forgot-password" className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 text-stone-800 font-sans antialiased flex flex-col min-h-screen">
      <style jsx global>{`
        .glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <img src={LOGO} alt="Pray-Read Bible Logo" className="h-14 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => router.push('/login')} className="text-stone-700 hover:text-stone-900 font-medium transition-colors">Log In</button>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-20 flex items-center justify-center relative px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-50/50 via-stone-50/80 to-stone-50 pointer-events-none"></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-stone-200/50 border border-stone-100 p-8 md:p-10 relative z-10">
          <div className="text-center mb-10">
            <img src={LOGO} alt="Pray-Read Bible" className="h-20 w-auto mx-auto mb-6 drop-shadow-md" />
            <h2 className="font-display text-3xl font-bold text-stone-900 mb-2">Set New Password</h2>
            <p className="text-stone-500">Create a new password for <strong>{email}</strong></p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <i className="ph ph-warning-circle text-lg"></i>{error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
              <i className="ph ph-check-circle text-lg"></i>{success}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700">New Password</label>
              <div className="relative">
                <input type="password" id="newPassword" placeholder="••••••••" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none transition-all placeholder:text-stone-400 text-stone-900"
                  required disabled={isLoading} minLength={6} />
                <i className="ph ph-lock absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700">Confirm New Password</label>
              <div className="relative">
                <input type="password" id="confirmPassword" placeholder="••••••••" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none transition-all placeholder:text-stone-400 text-stone-900"
                  required disabled={isLoading} minLength={6} />
                <i className="ph ph-lock absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span>{isLoading ? 'Saving...' : 'Save New Password'}</span>
              {!isLoading && <i className="ph ph-check"></i>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors flex items-center justify-center gap-2">
              <i className="ph ph-arrow-left"></i>Back to Login
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-stone-950 text-stone-400 py-8 border-t border-stone-900 relative z-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs">
          <p className="text-stone-500">&copy; 2026 Pneuma Freedom Experience Ministry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
