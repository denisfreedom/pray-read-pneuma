'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuthProtectedLinkProps {
  href: string;
  children: ReactNode;
}

export default function AuthProtectedLink({ href, children }: AuthProtectedLinkProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isAuthenticated === false) {
      // Redirect to signup page
      router.push('/signup');
    } else if (isAuthenticated === true) {
      // Navigate to the intended page
      router.push(href);
    }
  };

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return <div onClick={handleClick}>{children}</div>;
  }

  return <div onClick={handleClick}>{children}</div>;
}
