'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

const LOGO = 'https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png';

export default function AdminNavbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, admin, logout, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-stone-200 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <img src={LOGO} alt="Pray-Read Bible Logo" className="h-14 w-auto" />
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => router.push('/')} className="text-stone-500 hover:text-stone-900 transition-colors">Home</button>
          <button onClick={() => router.push('/about')} className="text-stone-500 hover:text-stone-900 transition-colors">About Us</button>
          {isAdmin && (
            <>
              <button onClick={() => router.push('/admin-panel')} className="text-stone-500 hover:text-stone-900 transition-colors">Admin Panel</button>
              <button onClick={() => router.push('/admin-panel/settings')} className="text-stone-500 hover:text-stone-900 transition-colors">Settings</button>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isAdmin ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-gold-50 rounded-lg">
                <i className="ph ph-user-circle text-gold-600 text-lg"></i>
                <span className="text-sm font-medium text-stone-900">{admin?.name}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium flex items-center gap-2"
              >
                <i className="ph ph-sign-out"></i> Logout
              </button>
            </>
          ) : (
            <>
              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium flex items-center gap-2">
                <i className="ph ph-heart"></i> Donate
              </a>
              <button onClick={() => router.push('/login')} className="text-stone-900 font-medium hover:text-gold-600 transition-colors">Log In</button>
              <button onClick={() => router.push('/signup')} className="px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-xl active:scale-95 text-sm font-medium">
                Sign Up
              </button>
            </>
          )}
        </div>

        <button className="md:hidden text-stone-800 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <i className="ph ph-list text-2xl"></i>
        </button>
      </div>

      <div className={`${mobileMenuOpen ? '' : 'hidden'} md:hidden bg-white border-t border-stone-200 shadow-lg`}>
        <nav className="px-6 py-4 space-y-3">
          <button onClick={() => router.push('/')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Home</button>
          <button onClick={() => router.push('/about')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">About Us</button>
          {isAdmin && (
            <>
              <button onClick={() => router.push('/admin-panel')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Admin Panel</button>
              <button onClick={() => router.push('/admin-panel/settings')} className="block w-full text-left py-3 px-4 text-stone-700 hover:bg-stone-50 rounded-lg transition-colors">Settings</button>
            </>
          )}
          <div className="border-t border-stone-200 pt-3 space-y-3">
            {isAdmin ? (
              <>
                <div className="flex items-center gap-2 px-4 py-3 bg-gold-50 rounded-lg">
                  <i className="ph ph-user-circle text-gold-600 text-lg"></i>
                  <span className="text-sm font-medium text-stone-900">{admin?.name}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-center py-3 px-4 bg-stone-900 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <i className="ph ph-sign-out"></i> Logout
                </button>
              </>
            ) : (
              <>
                <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 px-4 bg-gold-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                  <i className="ph ph-heart"></i> Donate
                </a>
                <button onClick={() => router.push('/login')} className="block w-full text-center py-3 px-4 text-stone-900 font-medium bg-gold-50 rounded-lg">Log In</button>
                <button onClick={() => router.push('/signup')} className="block w-full text-center py-3 px-4 bg-stone-900 text-white rounded-lg font-medium">Sign Up</button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
