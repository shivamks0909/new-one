"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { login } from '@/lib/auth';
import { useAuthState } from '@/lib/useAuthState';
import './login-glass.css';

/* ─── SVG Icons Matching Reference ─── */
function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading, role } = useAuthState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

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

    if (!email.trim()) {
      setErrorMessage('Email address is required');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password);
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

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  return (
    <div id="login-screen" className="login-screen h-screen max-h-screen overflow-hidden">
      {/* ─── Left: Brand Hero Matching Exact Antidetect Design ─── */}
      <div className="login-hero">
        <div className="hero-bg">
          <svg className="hero-circle-1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
            <circle cx="300" cy="300" r="280" fill="none" stroke="rgba(0,191,165,0.08)" strokeWidth="1" />
            <circle cx="300" cy="300" r="220" fill="none" stroke="rgba(0,191,165,0.06)" strokeWidth="1" />
            <circle cx="300" cy="300" r="160" fill="none" stroke="rgba(0,191,165,0.04)" strokeWidth="1" />
          </svg>
          <svg className="hero-circle-2" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(139,195,74,0.06)" strokeWidth="1" />
            <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(139,195,74,0.04)" strokeWidth="1" />
          </svg>
        </div>

        <div className="hero-content">
          {/* Exact Brand Logo from antidetecr browser */}
          <div className="hero-logo">
            <img
              src="/brand-logo.png"
              alt="Opinion Insights"
              className="hero-logo-img"
            />
          </div>

          {/* Brand title */}
          <h1 className="hero-title">
            <span className="brand-opinion">Opinion</span>{" "}
            <span className="brand-insights">insights</span>
          </h1>
          <p className="hero-tagline">Voice Today. Impact Tomorrow.</p>

          {/* Divider with glowing teal dot */}
          <div className="hero-divider">
            <span className="divider-dot"></span>
          </div>

          {/* 4 Feature pillars matching reference */}
          <div className="hero-features">
            <div className="hero-feature">
              <div className="feature-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  <path d="M8 12h.01" />
                  <path d="M12 12h.01" />
                  <path d="M16 12h.01" />
                </svg>
              </div>
              <span className="feature-label">
                Share your<br /><strong>opinion</strong>
              </span>
            </div>

            <div className="hero-feature">
              <div className="feature-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8BC34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <span className="feature-label">
                Drive<br /><strong>meaningful change</strong>
              </span>
            </div>

            <div className="hero-feature">
              <div className="feature-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span className="feature-label">
                Empower<br /><strong>communities</strong>
              </span>
            </div>

            <div className="hero-feature">
              <div className="feature-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00BFA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <span className="feature-label">
                Create real<br /><strong>impact</strong>
              </span>
            </div>
          </div>

          {/* Trust statistics */}
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">40+</span>
              <span className="stat-label">Markets</span>
            </div>
            <div className="stat">
              <span className="stat-number">72h</span>
              <span className="stat-label">Turnaround</span>
            </div>
            <div className="stat">
              <span className="stat-number">99%</span>
              <span className="stat-label">Validation</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right: Dark Luxury Glass Form Side ─── */}
      <div className="login-form-side">
        <svg className="login-dots" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern patternUnits="userSpaceOnUse" height="24" width="24" id="loginDots">
              <circle fill="rgba(0,191,165,0.08)" r="0.8" cy="2" cx="2"></circle>
            </pattern>
          </defs>
          <rect fill="url(#loginDots)" height="100%" width="100%"></rect>
        </svg>

        {/* Glassmorphic Login Card */}
        <div className="login-card-glass">
          <div className="beam-container">
            <div className="beam"></div>
            <div className="beam beam-2"></div>
          </div>

          <div className="login-form-inner">
            {/* Center Logo */}
            <div className="login-logo-wrap">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
                <img
                  src="/brand-logo.png"
                  alt="Opinion Insights"
                  className="w-12 h-12 object-contain filter drop-shadow-md"
                />
              </div>
            </div>

            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to your account</p>

            <form
              id="login-form"
              className="login-form-glass"
              onSubmit={handleSubmit}
              autoComplete="off"
              noValidate
            >
              {/* Email / Username */}
              <div className="input-glass-wrap">
                <IconMail className="input-icon" />
                <input
                  ref={emailInputRef}
                  type="text"
                  id="login-email"
                  className="input-glass"
                  placeholder="Email or Username"
                  autoComplete="username"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  disabled={loading}
                  required
                />
              </div>

              {/* Password */}
              <div className="input-glass-wrap">
                <IconLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  className="input-glass"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  id="toggle-password"
                  className="toggle-pw-btn"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div id="login-error" className="login-error-glass">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="login-submit-glass"
                id="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <span className="login-btn-text">Sign In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}