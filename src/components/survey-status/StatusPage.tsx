'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import {
  OutcomeConfig,
  OUTCOME_CONFIG,
  resolveOutcome,
  SurveyOutcome,
  buildDynamicRedirectUrl,
} from '../../lib/survey/outcome-config';
import { OutcomeHero } from './OutcomeHero';
import { SurveyInfoCard } from './SurveyInfoCard';
import { TrustBadges } from './TrustBadges';
import { BottomFooter } from './BottomFooter';
import { FluidCanvas } from './FluidCanvas';
import { CartoonMascot } from './CartoonMascot';
import { soundFX } from '@/lib/survey/sound-fx';

interface StatusPageProps {
  outcomeParam?: string;
  pid?: string;
  uid?: string;
  ip?: string;
  loi?: string;
  projectId?: string;
  returnUrl?: string;
  isVerified?: boolean;
  fraudBlocked?: boolean;
}

const OUTCOME_OPTIONS: SurveyOutcome[] = [
  'COMPLETE',
  'QUOTA_FULL',
  'TERMINATE',
  'QUALITY_TERM',
  'CLOSED',
  'PAUSED',
  'DUPLICATE_ID',
  'COUNTRY_MISMATCH',
  'SAME_IP',
];

export function StatusPage({
  outcomeParam,
  pid,
  uid,
  ip,
  loi,
  projectId,
  returnUrl,
  isVerified = true,
  fraudBlocked = false,
}: StatusPageProps) {
  const outcome: SurveyOutcome = resolveOutcome(outcomeParam);
  const config: OutcomeConfig = OUTCOME_CONFIG[outcome];

  const respondentId = uid || pid || 'RESP-94821';
  const dynamicCtaUrl = buildDynamicRedirectUrl(outcome, {
    customUrl: returnUrl,
    pid,
    uid,
    projectId,
  });

  // Determine active sound: each outcome link has its own separate distinct audio meme
  const activeSoundUrl = fraudBlocked
    ? '/sound/quality_term.mp3'
    : (config.soundUrl || '/sound/complete.mp3');

  // Autoplay real sound on page load + unlock on user interaction
  useEffect(() => {
    let triggered = false;
    const play = () => {
      if (triggered) return;
      triggered = true;
      soundFX.playAudioFile(activeSoundUrl);
    };

    play();

    const unlock = () => {
      play();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };
  }, [activeSoundUrl]);

  return (
    <div
      className="relative h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden transition-colors duration-700 select-none"
      style={{
        background: `linear-gradient(135deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 45%, ${config.gradient[2]} 100%)`,
      }}
    >
      {/* ── Apple Liquid Fluid Realistic Moving Water Wave Canvas ── */}
      <FluidCanvas color={config.accent} accentLight={config.accentLight} />

      {/* ── Ambient Floating Blobs (Fluid Dispersion Effect) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          animate={{
            x: [0, 50, -35, 0],
            y: [0, -40, 35, 0],
            scale: [1, 1.2, 0.95, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-28 -top-28 h-[460px] w-[460px] rounded-full blur-3xl opacity-60"
          style={{ backgroundColor: config.accentLight }}
        />
        <motion.div
          animate={{
            x: [0, -50, 35, 0],
            y: [0, 40, -35, 0],
            scale: [1, 1.25, 0.9, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-28 -bottom-28 h-[480px] w-[480px] rounded-full blur-3xl opacity-50"
          style={{ backgroundColor: `${config.accent}33` }}
        />
      </div>

      {/* ── Top Header (Clean Production Ready) ── */}
      <header className="relative z-20 w-full shrink-0">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-3.5 flex items-center justify-between gap-3">

          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/brand-logo.png"
              alt="Opinion Insights"
              className="h-9 w-9 shrink-0 object-contain rounded-xl drop-shadow-md"
            />
            <span className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
              Opinion <span style={{ color: config.accentText }}>Insights</span>
            </span>
          </div>

          {/* Header Right: Verified / Unverified Session (Liquid Glass Capsule) */}
          <div className="flex items-center gap-2.5">
            {fraudBlocked ? (
              <div
                className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold select-none border transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(254, 226, 226, 0.88)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#991b1b',
                  boxShadow: '0 8px 24px -4px rgba(239, 68, 68, 0.25), inset 0 1px 0.5px rgba(255, 255, 255, 0.95)',
                }}
              >
                <div className="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/60 to-transparent" />
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600 relative z-10" />
                <span className="relative z-10">Tampering Blocked</span>
              </div>
            ) : isVerified ? (
              <div
                className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold text-slate-700 border select-none transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.72)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  borderColor: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08), inset 0 1px 0.5px rgba(255, 255, 255, 0.95)',
                }}
              >
                <div className="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/50 to-transparent" />
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 relative z-10" />
                <span className="relative z-10 text-emerald-950 font-extrabold">Verified Session</span>
              </div>
            ) : (
              <div
                onClick={() => soundFX.playAudioFile(activeSoundUrl)}
                title="Click to play warning audio"
                className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold select-none border transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'rgba(254, 243, 199, 0.92)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  borderColor: 'rgba(245, 158, 11, 0.55)',
                  color: '#92400e',
                  boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.25), inset 0 1px 0.5px rgba(255, 255, 255, 0.95)',
                }}
              >
                <div className="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/60 to-transparent" />
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 relative z-10" />
                <span className="relative z-10">Unverified Entry • Direct Link</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Viewport (Zero Scroll, Full Screen Responsive Layout) ── */}
      <main className="relative z-10 w-full flex-1 min-h-0 flex flex-col justify-center px-6 sm:px-8 py-2 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full h-full min-h-0 flex flex-col justify-center">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10 items-center h-full min-h-0">
            {/* Left Column (Typography, CTA, Trust Badges) */}
            <div className="lg:col-span-7 flex flex-col items-start gap-3 sm:gap-4 min-h-0 justify-center">
              {/* Eyebrow Status Pill (Liquid Glass Effect) */}
              <div
                onClick={() => soundFX.playAudioFile(activeSoundUrl)}
                title="Click to play status audio"
                className="relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-wider uppercase select-none border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: fraudBlocked
                    ? 'rgba(254, 226, 226, 0.7)'
                    : !isVerified
                    ? 'rgba(254, 243, 199, 0.7)'
                    : `${config.accentLight}55`,
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  color: fraudBlocked ? '#991b1b' : !isVerified ? '#92400e' : config.accentText,
                  borderColor: fraudBlocked ? '#ef444455' : !isVerified ? '#f59e0b55' : `${config.accent}44`,
                  boxShadow: `0 6px 18px -3px ${fraudBlocked ? '#ef444433' : !isVerified ? '#f59e0b33' : config.accent}22, inset 0 1px 0.5px rgba(255, 255, 255, 0.85)`,
                }}
              >
                {/* Top Gloss Reflection */}
                <div className="pointer-events-none absolute inset-x-2 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/40 to-transparent" />
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: fraudBlocked ? '#ef4444' : !isVerified ? '#f59e0b' : config.accent }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: fraudBlocked ? '#ef4444' : !isVerified ? '#f59e0b' : config.accent }}
                  />
                </span>
                <span className="relative z-10 font-bold">
                  {fraudBlocked
                    ? 'Security Gate • Fake Complete Blocked'
                    : !isVerified
                    ? 'Audit Warning • Direct Survey Link (Unverified)'
                    : `Status Telemetry • ${config.statusPill}`}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] font-black tracking-[-0.035em] text-slate-950 leading-[1.08]">
                {config.titlePrefix}
                <span style={{ color: config.accentText }}>
                  {config.titleAccent}
                </span>
              </h1>

              {/* Subtitle & Description */}
              <div className="flex flex-col gap-1.5">
                <p className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  {config.subtitle}
                </p>
                <p className="text-xs sm:text-[13.5px] text-slate-600 leading-relaxed max-w-xl">
                  {config.description}
                </p>
              </div>

              {/* CTA Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1 w-full sm:w-auto">
                <motion.a
                  href={dynamicCtaUrl}
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative flex items-center justify-center gap-2 rounded-full px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-lg transition-all select-none w-full sm:w-auto"
                  style={{
                    backgroundColor: config.accent,
                    boxShadow: `0 8px 24px -4px ${config.accent}66`,
                  }}
                >
                  <span>{config.cta}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </motion.a>

                <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2.5 text-[11px] font-bold text-slate-700 border border-white/90 shadow-2xs backdrop-blur-md">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: config.accentText }} />
                  <span>Respondent Logged</span>
                </div>
              </div>

              {/* Trust Badges Deck */}
              <div className="w-full max-w-xl pt-1">
                <TrustBadges config={config} />
              </div>
            </div>

            {/* Right Column (Apple Liquid Glass Card with Hero Badge + Cartoon Mascot) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center w-full min-h-0">
              <div
                className="relative w-full max-w-md rounded-[28px] bg-white/90 backdrop-blur-2xl p-5 sm:p-6 border border-white/95 transition-all duration-300 flex flex-col gap-4 min-h-0"
                style={{
                  boxShadow:
                    '0 24px 60px rgba(15, 23, 42, 0.10), 0 4px 20px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                }}
              >
                {/* ── Apple Liquid Hero Badge + Shinchan Integrated Celebration Stage ── */}
                <div className="relative w-full rounded-2xl bg-gradient-to-b from-white/95 to-slate-50/70 py-3.5 px-4 sm:px-6 border border-slate-100/80 shadow-xs flex items-center justify-center gap-5 sm:gap-7 overflow-hidden">
                  {/* Subtle celebratory background radial glow centered */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${config.accent} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Left: Rebalanced Liquid Glass Hero Checkmark Badge */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <OutcomeHero outcome={outcome} config={config} />
                  </div>

                  {/* Subtle Audio Wave Equalizer Bridge */}
                  <div className="flex items-center gap-1 opacity-50 shrink-0">
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-2.5" />
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-4" />
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2.5" />
                  </div>

                  {/* Right: Harmonized Clean Shinchan Mascot */}
                  <div className="relative flex items-center justify-center shrink-0 cursor-pointer">
                    <CartoonMascot outcome={outcome} character="shinchan" />
                  </div>
                </div>

                {/* Telemetry Card */}
                <SurveyInfoCard
                  pid={pid}
                  uid={uid}
                  ip={ip}
                  loi={loi}
                  projectId={projectId}
                  config={config}
                  isVerified={isVerified}
                  fraudBlocked={fraudBlocked}
                />

                {/* Bottom Watermark & Handwritten Script */}
                <BottomFooter config={config} />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Compact Footer (Zero Scroll) ── */}
      <footer className="relative z-20 w-full shrink-0 border-t border-slate-200/60 bg-white/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span>© 2026 Opinion Insights CAWI Telemetry.</span>
            <span>All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>ISO 20252 Compliant</span>
            <span>•</span>
            <span>256-bit Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
