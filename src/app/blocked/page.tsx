"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Copy, Check, Mail, AlertTriangle, Fingerprint, Clock } from 'lucide-react';

function BlockedContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ref = searchParams.get('ref') || 'BLK-SEC-UNKNOWN';
  const type = (searchParams.get('type') || 'IP').toUpperCase();
  const headline = searchParams.get('headline') || (type === 'IP' ? 'Pehle Hi Complete Hai!' : 'UID Pehle Se Used Hai!');
  const message = searchParams.get('msg') || (
    type === 'IP'
      ? 'Bhai, tumne is survey ko pehle hi complete kar liya hai. Fir kyu aa rahe ho?'
      : 'Ye UID is project me pehle use ho chuka hai. Naya UID lekar aao, ya vendor se naya le lo.'
  );
  const projectName = searchParams.get('project') || searchParams.get('pname') || 'Opinion Study Project';
  const projectCode = searchParams.get('pid') || 'PX-STUDY';
  const uid = searchParams.get('uid') || '';
  const blockedAt = searchParams.get('time') || new Date().toISOString();
  const prevTime = searchParams.get('prev');

  const copyRef = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) return null;

  const formattedTime = new Date(blockedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Background ambient red glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight text-white text-sm">
            Opinion Insights <span className="text-red-400 text-xs font-mono font-normal">/ Security Gate</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Duplicate Restricted
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/40 relative">
          {/* Reference pill */}
          <div className="flex items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-full px-4 py-2 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Fingerprint className="h-3.5 w-3.5 text-red-400" />
              <span>Reference ID:</span>
              <span className="text-white font-bold">{ref}</span>
            </div>
            <button
              onClick={copyRef}
              title="Copy Reference ID"
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Headline and message */}
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 items-center justify-center text-red-400 mb-1">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              {headline}
            </h1>
            <p className="text-sm sm:text-base font-medium text-red-300/90 leading-relaxed bg-red-950/30 border border-red-800/40 rounded-2xl p-4">
              "{message}"
            </p>
          </div>

          {/* Project & Incident Telemetry */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs font-mono mb-6">
            <div className="flex justify-between items-center text-slate-400">
              <span>Project:</span>
              <span className="text-slate-200 font-semibold">{projectName} ({projectCode})</span>
            </div>
            {uid && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Recorded UID:</span>
                <span className="text-amber-400 font-semibold truncate max-w-[200px]">{uid}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-400">
              <span>Violation Type:</span>
              <span className="text-red-400 font-semibold">{type === 'IP' ? 'IP Complete Duplicate' : 'UID Session Collision'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Blocked Timestamp:</span>
              <span className="text-slate-300">{formattedTime}</span>
            </div>
            {prevTime && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Previous Use:</span>
                <span className="text-slate-300">{new Date(prevTime).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <a
              href={`mailto:support@opinioninsights.in?subject=Blocked%20Reference%20${encodeURIComponent(ref)}&body=Hello%20Support%2C%0A%0AMy%20survey%20entry%20was%20blocked%20with%20Reference%20ID%3A%20${encodeURIComponent(ref)}%20for%20Project%3A%20${encodeURIComponent(projectCode)}.`}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 text-xs sm:text-sm border border-slate-700 transition-colors shadow-sm"
            >
              <Mail className="h-4 w-4 text-slate-400" />
              <span>Contact Platform Support</span>
            </a>
            <p className="text-[11px] text-slate-500 text-center">
              Please quote reference ID <span className="font-mono text-slate-400">{ref}</span> in all inquiries.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
        <div>© 2026 Opinion Insights CAWI Platform Telemetry.</div>
        <div className="flex items-center gap-2">
          <span>ISO 20252 Compliant</span>
          <span>•</span>
          <span>Automated Anti-Fraud Sentinel</span>
        </div>
      </footer>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center font-mono text-sm">Loading security gateway...</div>}>
      <BlockedContent />
    </Suspense>
  );
}
