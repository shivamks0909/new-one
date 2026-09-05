"use client";

import { useState, useEffect } from 'react';
import { subscribe, checkAuth, getAuthState, type AuthState } from './auth';

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(() => getAuthState());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      // Pull latest auth state on every notify
      setState({ ...getAuthState() });
    });
    // Initialize auth check
    checkAuth();
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
