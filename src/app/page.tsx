"use client";

import { useEffect } from 'react';
import { useAuthState } from '@/lib/useAuthState';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const { isAuthenticated, isLoading, role } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (role === 'VENDOR') {
          router.replace('/dashboard/vendor');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, role, router]);

  return null;
}
