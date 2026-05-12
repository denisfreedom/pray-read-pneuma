'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AuthProtectedLinkProps {
  href: string;
  children: ReactNode;
}

export default function AuthProtectedLink({ href, children }: AuthProtectedLinkProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => setIsLoggedIn(data.isUser || data.isAdmin))
      .catch(() => setIsLoggedIn(false));
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      router.push(`/signup?redirect=${encodeURIComponent(href)}&message=Please+sign+up+or+login+to+access+this+feature`);
    }
  };

  return (
    <Link href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}
