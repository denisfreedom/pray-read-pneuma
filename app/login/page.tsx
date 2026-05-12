'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import VisitorMap from '../components/VisitorMap';
import { useAuthStore } from '../store/authStore';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1772095223716_ixlbyk.png';

export default function LoginPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setAdmin = useAuthStore(state => state.setAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success && data.admin) {
        setAdmin(data.admin);
        // Use window.location for full page navigation to ensure session is properly loaded
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
    <div className="bg-stone-50 text-stone-800 font-sans selection:bg-gold-500/20 selection:text-gold-700 antialiased flex flex-col min-h-screen">
      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
          -webkit-box-shadow: 0 0 0 30px white inset !important;
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
            <button onClick={() => router.push('/verse-songs')} className="text-stone-500 hover:text-stone-900 transition-colors">Verse-Songs</button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium flex items-center gap-2">
              <i className="ph ph-heart"></i> Donate
            </a>
            <button className="text-stone-900 font-medium cursor-default border-b-2 border-gold-500 pb-0.5">Log In</button>
            <button onClick={() => router.push('/signup')} className="px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium">
              Sign Up
            </button>
          </div>

          <button id="mobileMenuBtn" className="md:hidden text-stone-800 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <i className="ph ph-list text-2xl"></i>
          </button>
        </div>

        <div id="mobileMenu" className={`${mobileMenuOpen ? '' : 'hidden'} md:hidden bg-white border-t border-stone-200 shadow-lg`}>
          <nav className="px-6 py-4 space-y-3">
            <button onClick={() => router.push('/')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Home</button>
            <button onClick={() => router.push('/about')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">About Us</button>
            <button onClick={() => router.push('/verse-songs')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Verse-Songs</button>
            <div className="border-t border-stone-200 pt-3 space-y-3">
              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 px-4 bg-gold-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                <i className="ph ph-heart"></i> Donate
              </a>
              <button onClick={() => router.push('/login')} className="block w-full text-center py-3 px-4 text-stone-900 font-medium bg-gold-50 rounded-lg">Log In</button>
              <button onClick={() => router.push('/signup')} className="block w-full text-center py-3 px-4 bg-stone-900 text-white rounded-lg font-medium">Sign Up</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-20 flex items-center justify-center relative px-4">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507692049790-de58293a4697?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-stone-50/50 via-stone-50/80 to-stone-50 pointer-events-none"></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-stone-200/50 border border-stone-100 p-8 md:p-10 relative z-10 animate-fade-in-up">
          
          <div className="text-center mb-10">
            <img src={LOGO} alt="Pray-Read Bible" className="h-20 w-auto mx-auto mb-6 drop-shadow-md" />
            <h2 className="font-display text-3xl font-bold text-stone-900 mb-2">Admin Login</h2>
            <p className="text-stone-500">Sign in to access the admin panel.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <i className="ph ph-warning-circle text-lg"></i>
              {error}
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

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-stone-700">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 outline-none transition-all placeholder:text-stone-400 text-stone-900" 
                  required 
                  disabled={isLoading}
                />
                <i className="ph ph-lock absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg hover:shadow-stone-900/20 font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              {!isLoading && <i className="ph ph-arrow-right group-hover:translate-x-1 transition-transform"></i>}
            </button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-gold-600 hover:text-gold-700 hover:underline transition-colors">
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
            <p className="font-medium mb-1">Demo Admin Credentials:</p>
            <p className="text-blue-700">Email: <span className="font-mono">admin@prayread.com</span></p>
            <p className="text-blue-700">Password: <span className="font-mono">admin123</span></p>
          </div>
          
        </div>
      </main>

      <footer className="bg-stone-950 text-stone-400 py-16 border-t border-stone-900 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Brand Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <img src={LOGO} alt="Pray-Read Bible Logo" className="h-16 w-auto" />
              </div>
              <p className="text-sm leading-relaxed text-stone-500">
                Christ Faculty Hub - A dual-language Bible platform bringing scripture to life for the modern believer.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 bg-stone-900 hover:bg-orange-600 rounded-full flex items-center justify-center transition-colors">
                  <i className="ph ph-facebook-logo text-lg"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-stone-900 hover:bg-orange-600 rounded-full flex items-center justify-center transition-colors">
                  <i className="ph ph-twitter-logo text-lg"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-stone-900 hover:bg-orange-600 rounded-full flex items-center justify-center transition-colors">
                  <i className="ph ph-youtube-logo text-lg"></i>
                </a>
              </div>
            </div>

            {/* Platform Links */}
            <div className="space-y-4">
              <h4 className="text-stone-100 font-semibold text-lg mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><span className="text-orange-500 font-medium">✓ Admin Login</span></li>
                <li><button onClick={() => router.push('/signup')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Create Account</button></li>
                <li><button onClick={() => router.push('/')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Read Bible</button></li>
                <li><button onClick={() => router.push('/verse-songs')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Verse-Songs</button></li>
                <li><button onClick={() => router.push('/reading-plans')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Reading Plans</button></li>
              </ul>
            </div>

            {/* Ministry Links */}
            <div className="space-y-4">
              <h4 className="text-stone-100 font-semibold text-lg mb-4">Ministry</h4>
              <ul className="space-y-3">
                <li><button onClick={() => router.push('/about')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">About Us</button></li>
                <li><button onClick={() => router.push('/community')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Community</button></li>
                <li><button onClick={() => router.push('/contact')} className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Contact</button></li>
                <li>
                  <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block flex items-center gap-2">
                    <i className="ph ph-heart"></i> Donate
                  </a>
                </li>
              </ul>
            </div>

            {/* Visitor Map */}
            <div className="space-y-4">
              <h4 className="text-stone-100 font-semibold text-lg mb-4">Global Reach</h4>
              <VisitorMap />
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-stone-900 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <p className="text-stone-500">&copy; 2026 Pneuma Freedom Experience Ministry. All rights reserved.</p>
              <div className="text-center md:text-right">
                <p className="text-stone-500">Developed by <span className="text-orange-500 font-medium">Ion Hosting Digital Services</span></p>
                <p className="mt-1 text-stone-600">Pneuma Freedom Experience Ministry - Christ Faculty Hub</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
