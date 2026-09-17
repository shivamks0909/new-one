"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function MockSurveyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') || searchParams.get('session_token') || '';
  const uid = searchParams.get('uid') || searchParams.get('zid') || 'TEST-UID-001';
  const pid = searchParams.get('pid') || searchParams.get('code') || '';

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleOutcome = (outcome: 'complete' | 'terminate' | 'quotafull') => {
    setSubmitting(true);
    const params = new URLSearchParams();
    if (token) params.set('session_token', token);
    if (uid) params.set('uid', uid);
    if (pid) params.set('pid', pid);
    params.set('qa_bypass', '1');

    const targetUrl = `/redirect/${outcome}?${params.toString()}`;
    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Banner */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/20">
            <span>●</span>
            <span>MOCK SURVEY SIMULATOR (QA TEST RUNNER)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Client Survey In Progress</h1>
          <p className="text-sm text-slate-400">
            Simulating client survey questionnaire for respondent testing. Select an outcome to submit terminal callback.
          </p>
        </div>

        {/* Session Metadata Card */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span>Session Token:</span>
            <span className="text-amber-400 font-semibold truncate max-w-xs">{token || 'NO_TOKEN_PASSED'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Respondent UID:</span>
            <span className="text-emerald-400 font-semibold">{uid}</span>
          </div>
          {pid && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Project ID:</span>
              <span className="text-blue-400 font-semibold">{pid}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-400">
            <span>QA Bypass:</span>
            <span className="text-purple-400 font-semibold">Enabled (Speed bypass active)</span>
          </div>
        </div>

        {/* Outcome Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            id="btn-complete-survey"
            disabled={submitting}
            onClick={() => handleOutcome('complete')}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            <span>✓</span>
            <span>Complete Survey (Qualified & Finished)</span>
          </button>

          <button
            id="btn-terminate-survey"
            disabled={submitting}
            onClick={() => handleOutcome('terminate')}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            <span>✕</span>
            <span>Terminate Survey (Screened Out)</span>
          </button>

          <button
            id="btn-quotafull-survey"
            disabled={submitting}
            onClick={() => handleOutcome('quotafull')}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            <span>■</span>
            <span>Quota Full (Over Target Cap)</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-800/60">
          Opinion Insights CAWI Platform QA Engine • Local Environment
        </div>
      </div>
    </div>
  );
}

export default function MockSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-mono text-sm">Loading mock survey...</div>}>
      <MockSurveyContent />
    </Suspense>
  );
}
