'use client';

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

  // Check for redirect message from middleware
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg) {
      setMessage(msg);
    }
    // Pass redirect param through to login page
    const redirect = params.get('redirect');
    if (redirect) {
      setLoginHref(`/user-login?redirect=${encodeURIComponent(redirect)}&message=Please+sign+in+to+access+this+feature`);
    }
  }, []);

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Wait to ensure cookie is set before redirecting
        await new Promise(resolve => setTimeout(resolve, 300));

        const params = new URLSearchParams(window.location.search);
        const rawRedirect = params.get('redirect') || '/dashboard';
        // Avoid redirect loops — never send back to login/signup pages
        const safeRedirect = (rawRedirect === '/user-login' || rawRedirect === '/signup' || rawRedirect === '/login')
          ? '/dashboard'
          : rawRedirect;

        // Detect iframe/preview context
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
          try {
            window.parent.postMessage(
              { type: 'AUTH_SUCCESS', redirect: safeRedirect, user: data.user },
              '*'
            );
          } catch (_) {}
        }
        window.location.replace(safeRedirect);
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
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
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <img src={LOGO} alt="Pray-Read Bible Logo" className="h-14 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-stone-500 hover:text-stone-900 transition-colors">Home</Link>
            <Link href="/about" className="text-stone-500 hover:text-stone-900 transition-colors">About Us</Link>
            <Link href="/verse-songs" className="text-stone-500 hover:text-stone-900 transition-colors">Verse-Songs</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium flex items-center gap-2">
              <i className="ph ph-heart"></i> Donate
            </a>
            <button className="px-5 py-2.5 bg-stone-900 text-white rounded-lg cursor-default shadow-inner text-sm font-medium ring-2 ring-stone-900 ring-offset-2">
              Sign Up
            </button>
          </div>

          <button 
            id="mobileMenuBtn" 
            className="md:hidden text-stone-800 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className="ph ph-list text-2xl"></i>
          </button>
        </div>

        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white border-t border-stone-200 shadow-lg`}>
          <nav className="px-6 py-4 space-y-3">
            <Link href="/" className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Home</Link>
            <Link href="/about" className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">About Us</Link>
            <Link href="/verse-songs" className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Verse-Songs</Link>
            <div className="border-t border-stone-200 pt-3 space-y-3">
              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 px-4 bg-gold-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                <i className="ph ph-heart"></i> Donate
              </a>
              <Link href="/signup" className="block w-full text-center py-3 px-4 text-stone-900 font-medium bg-gold-50 rounded-lg">Sign Up</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-20 flex items-center justify-center relative px-4 py-12 overflow-hidden">
        {/* Beautiful gradient background with animated shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/90 via-purple-600/90 to-pink-500/90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=1920&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        
        {/* Animated decorative circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-stone-200/50 border border-stone-100 p-8 md:p-10 relative z-10 animate-fade-in-up">
          
          <div className="text-center mb-8">
            <img src={LOGO} alt="Pray-Read Bible" className="h-20 w-auto mx-auto mb-6 drop-shadow-md" />
            <h2 className="font-display text-3xl font-bold text-stone-900 mb-2">Join the Community</h2>
            <p className="text-stone-500">Create a free account to access the Bible, Q&amp;A, Devotionals, and all features.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSignupSubmit}>
            
            {message && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <i className="ph-fill ph-info text-blue-500"></i>
                <span>{message}</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-stone-700">Full Name</label>
              <div className="relative">
                <input type="text" id="name" name="name" placeholder="John Doe" 
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 outline-none transition-all placeholder:text-stone-400 text-stone-900" required disabled={loading} />
                <i className="ph ph-user absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email Address</label>
              <div className="relative">
                <input type="email" id="email" name="email" placeholder="john@example.com" 
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 outline-none transition-all placeholder:text-stone-400 text-stone-900" required disabled={loading} />
                <i className="ph ph-envelope absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-stone-700">Password</label>
              <div className="relative">
                <input type="password" id="password" name="password" placeholder="••••••••" 
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 outline-none transition-all placeholder:text-stone-400 text-stone-900" required disabled={loading} />
                <i className="ph ph-lock absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg"></i>
              </div>
            </div>

            <div className="bg-stone-50 rounded-lg p-3 flex gap-3 border border-stone-100">
              <i className="ph-fill ph-info text-gold-500 mt-0.5"></i>
              <p className="text-xs text-stone-500 leading-relaxed">
                By creating an account, you will have <strong className="text-stone-700">Frontend User</strong> access, allowing you to read scripture and use offline features. You will not have access to backend editing tools.
              </p>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg hover:shadow-stone-900/20 font-medium flex items-center justify-center gap-2 group mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <i className="ph ph-spinner animate-spin"></i>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Sign Up</span>
                  <i className="ph ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-stone-400">Already a member?</span>
            </div>
          </div>

          <div className="text-center">
            <Link 
              href={loginHref} 
              className="w-full py-3.5 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all font-medium block"
            >
              Sign In to Community
            </Link>
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
                <li><span className="text-orange-500 font-medium">✓ Create Account</span></li>
                <li><Link href="/" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Read Bible</Link></li>
                <li><Link href="/verse-songs" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Verse-Songs</Link></li>
                <li><Link href="/reading-plans" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Reading Plans</Link></li>
              </ul>
            </div>

            {/* Ministry Links */}
            <div className="space-y-4">
              <h4 className="text-stone-100 font-semibold text-lg mb-4">Ministry</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">About Us</Link></li>
                <li><Link href="/community" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Community</Link></li>
                <li><Link href="/contact" className="hover:text-orange-500 transition-colors hover:pl-2 inline-block">Contact</Link></li>
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
