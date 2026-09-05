"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { login } from '@/lib/auth';
import { useAuthState } from '@/lib/useAuthState';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, PieChart, Users, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading, role } = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (role === 'VENDOR') {
        window.location.href = '/dashboard/vendor';
      } else {
        window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated, isLoading, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email) {
      setErrorMessage('Email address is required');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      showToast('Welcome back! Redirecting...', 'success');
      if (loggedUser.role === 'VENDOR') {
        window.location.href = '/dashboard/vendor';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setErrorMessage(message);
      showToast(message, 'error');
      setLoading(false);
    }
  };

  const fillCredentials = (type: 'admin' | 'vendor') => {
    if (type === 'admin') {
      setEmail('admin@cawi.io');
      setPassword('admin123');
    } else {
      setEmail('vendor@test.com');
      setPassword('vendor123');
    }
    setErrorMessage('');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      formRef.current?.querySelector('input')?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* ─── Left: Brand Hero (Hidden on Mobile) ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-white border-r border-[var(--glass-border)] relative overflow-hidden">
        {/* Soft background shape */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[rgba(0,113,227,0.03)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[rgba(52,199,89,0.03)] blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">O</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Opinion<span className="text-[var(--accent-1)]">Insights</span>
          </h1>
        </div>

        <div className="relative z-10 max-w-lg mt-12">
          <h2 className="text-4xl font-black text-[var(--text-primary)] leading-tight mb-6">
            Enterprise Fieldwork<br />Operations Platform
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Securely manage studies, track global vendors, and analyze responses with verified analytics.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-blue-50 text-[var(--accent-1)] rounded-[var(--radius-sm)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Verified Outcomes</h3>
                <p className="text-sm text-[var(--text-secondary)]">Strict tracking verification prevents unverified traffic.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-green-50 text-[var(--color-success)] rounded-[var(--radius-sm)]">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Real-time Analytics</h3>
                <p className="text-sm text-[var(--text-secondary)]">Monitor conversions and fieldwork pace instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-purple-50 text-[var(--color-purple)] rounded-[var(--radius-sm)]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Isolated Vendor Workspaces</h3>
                <p className="text-sm text-[var(--text-secondary)]">Secure role-based access control out of the box.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-[var(--text-muted)] mt-12">
          &copy; {new Date().getFullYear()} Opinion Insights. All rights reserved.
        </div>
      </div>

      {/* ─── Right: Login Form ──────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-[420px] animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-[var(--radius-sm)] bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center shadow-md mx-auto mb-6 lg:hidden">
              <span className="text-white text-2xl font-bold">O</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h2>
            <p className="text-[var(--text-secondary)] mt-2">Sign in to your account</p>
          </div>

          <div className="glass-card p-8 mb-6">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-tertiary)] hover:bg-blue-50 border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm font-medium text-[var(--accent-1)] transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Demo
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('vendor')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-tertiary)] hover:bg-teal-50 border border-[var(--glass-border)] rounded-[var(--radius-sm)] text-sm font-medium text-teal-600 transition-colors"
              >
                <Users className="w-4 h-4" /> Vendor Demo
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1" htmlFor="login-email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="email"
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-[var(--glass-border)] rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)] focus:border-transparent transition-shadow shadow-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1" htmlFor="login-password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-[var(--glass-border)] rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)] focus:border-transparent transition-shadow shadow-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-[var(--color-danger)] text-sm rounded-[var(--radius-sm)] flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] hover:from-[var(--accent-2)] hover:to-[var(--accent-3)] text-white font-medium rounded-[var(--radius-sm)] transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <p className="text-center text-sm text-[var(--text-muted)]">
            Vendor access — use your assigned vendor credentials
          </p>
        </div>
      </div>
    </div>
  );
}