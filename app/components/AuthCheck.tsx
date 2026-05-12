'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface AuthCheckProps {
  children: React.ReactNode;
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.success && (data.isUser || data.isAdmin)) {
        setIsAuthenticated(true);
        setUserName(data.user?.name || data.admin?.name || '');
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Show loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <i className="ph ph-spinner text-4xl text-gold-600 animate-spin"></i>
          <p className="mt-4 text-stone-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth required message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ph-fill ph-lock text-3xl text-gold-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Sign In Required</h2>
          <p className="text-stone-600 mb-6">
            You need to create an account or sign in to access the full features of this Bible app.
          </p>
          <div className="space-y-3">
            <Link 
              href="/signup" 
              className="block w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all font-medium"
            >
              Create Account
            </Link>
            <Link 
              href="/user-login" 
              className="block w-full py-3 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-all font-medium"
            >
              Sign In
            </Link>
            <Link 
              href="/" 
              className="block text-sm text-stone-500 hover:text-gold-600 transition-colors mt-4"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, show content
  return <>{children}</>;
}
