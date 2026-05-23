'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset instructions have been sent to your email.');
        setEmail('');
      } else {
        setError(data.message || 'Failed to send reset instructions');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-stone-50 text-stone-800 font-sans selection:bg-gold-500/20 selection:text-gold-700 antialiased flex flex-col min-h-screen">
      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>

      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-stone-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <img src={LOGO} alt="Pray-Read Bible Logo" className="h-14 w-auto" />
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/')} className="text-stone-500 hover:text-stone-900 transition-colors">Home</button>
            <button onClick={() => router.push('/about')} className="text-stone-500 hover:text-stone-900 transition-colors">About Us</button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => router.push('/login')} className="text-stone-700 hover:text-stone-900 transition-colors font-medium">Log In</button>
            <button onClick={() => router.push('/signup')} className="px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium">
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-20 flex items-center justify-center relative px-4">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507692049790-de58293a4697?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-stone-50/50 via-stone-50/80 to-stone-50 pointer-events-none"></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-stone-200/50 border border-stone-100 p-8 md:p-10 relative z-10 animate-fade-in-up">
          
          <div className="text-center mb-10">
            <img src={LOGO} alt="Pray-Read Bible" className="h-20 w-auto mx-auto mb-6 drop-shadow-md" />
            <h2 className="font-display text-3xl font-bold text-stone-900 mb-2">Forgot Password</h2>
            <p className="text-stone-500">Enter your email to receive password reset instructions.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <i className="ph ph-warning-circle text-lg"></i>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
              <i className="ph ph-check-circle text-lg"></i>
              {success}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  id="email" 
                  placeholder="admin@prayread.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 outline-none transition-all placeholder:text-stone-400 text-stone-900" 
                  required 
                  disabled={isLoading}
                />
                <i className="ph ph-envelope absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg hover:shadow-stone-900/20 font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Sending...' : 'Send Reset Instructions'}</span>
              {!isLoading && <i className="ph ph-paper-plane-tilt group-hover:translate-x-1 transition-transform"></i>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gold-600 hover:text-gold-700 hover:underline transition-colors flex items-center justify-center gap-2">
              <i className="ph ph-arrow-left"></i>
              Back to Login
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
