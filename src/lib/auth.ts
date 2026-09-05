import { setAuthToken, getAuthToken } from './api';

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  full_name?: string;
  vendor_id?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string | null;
  vendor_id: string | null;
}

export type { AuthState };

let authState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  vendor_id: null,
};

const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getAuthState(): AuthState {
  return authState;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function checkAuth(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) {
    authState = { user: null, isAuthenticated: false, isLoading: false, role: null, vendor_id: null };
    notify();
    return false;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      authState = {
        user: data.data?.user || data.user || null,
        isAuthenticated: true,
        isLoading: false,
        role: data.data?.user?.role || data.user?.role || null,
        vendor_id: data.data?.user?.vendor_id || data.user?.vendor_id || null,
      };
      notify();
      return true;
    }
  } catch {
    // Ignore errors
  }

  setAuthToken(null);
  authState = { user: null, isAuthenticated: false, isLoading: false, role: null, vendor_id: null };
  notify();
  return false;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Login failed');
  }

  setAuthToken(data.data.token);
  authState = {
    user: data.data.user,
    isAuthenticated: true,
    isLoading: false,
    role: data.data.user?.role || null,
    vendor_id: data.data.user?.vendor_id || null,
  };
  notify();

  return data.data.user;
}

export function logout() {
  setAuthToken(null);
  authState = { user: null, isAuthenticated: false, isLoading: false, role: null, vendor_id: null };
  notify();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export function updateUser(user: Partial<User>) {
  if (authState.user) {
    authState = {
      ...authState,
      user: { ...authState.user, ...user },
      role: user.role || authState.user?.role,
      vendor_id: user.vendor_id ?? authState.user?.vendor_id ?? null,
    };
    notify();
  }
}
