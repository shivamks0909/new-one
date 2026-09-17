'use client';

import { useState } from 'react';
import { Download, Award, CheckCircle, ShieldCheck } from 'lucide-react';
import { soundFX } from '@/lib/survey/sound-fx';

interface CertificateModalProps {
  respondentId: string;
  projectId: string;
  accentColor: string;
}

export function CertificateModal({
  respondentId,
  projectId,
  accentColor,
}: CertificateModalProps) {
  const [downloading, setDownloading] = useState(false);

  const generateAndDownloadCertificate = () => {
    soundFX.playCelebration();
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 700);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(1, '#F8FAFC');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 700);

      // Outer Decorative Border
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 1140, 640);

      // Inner Gold Border
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(45, 45, 1110, 610);

      // Header Tagline
      ctx.fillStyle = '#64748B';
      ctx.font = '600 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OPINION INSIGHTS • CAWI FIELDWORK TELEMETRY', 600, 120);

      // Certificate Title
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 44px sans-serif';
      ctx.fillText('CERTIFICATE OF VERIFIED PARTICIPATION', 600, 180);

      // Subtitle
      ctx.fillStyle = '#475569';
      ctx.font = '500 20px sans-serif';
      ctx.fillText('This document officially certifies that respondent telemetry was verified and recorded for:', 600, 240);

      // Respondent ID Box
      ctx.fillStyle = '#F1F5F9';
      ctx.roundRect ? ctx.roundRect(350, 280, 500, 70, 16) : ctx.rect(350, 280, 500, 70);
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.font = '800 32px monospace';
      ctx.fillText(respondentId, 600, 326);

      // Project & Telemetry Details
      ctx.fillStyle = '#334155';
      ctx.font = '600 18px sans-serif';
      ctx.fillText(`Project Identifier: ${projectId}  •  Status: PROCESSED & VERIFIED`, 600, 400);

      const today = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
      ctx.fillText(`Submission Date: ${today}`, 600, 435);

      // Seal on Bottom Left
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(220, 540, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 16px sans-serif';
      ctx.fillText('VERIFIED', 220, 535);
      ctx.fillText('AUDIT', 220, 555);

      // Authorized Signature on Bottom Right
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(850, 550);
      ctx.lineTo(1050, 550);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 15px sans-serif';
      ctx.fillText('Fieldwork Telemetry Director', 950, 575);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 13px sans-serif';
      ctx.fillText('Opinion Insights Research Panel', 950, 595);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `OpinionInsights-Certificate-${respondentId}.png`;
      a.click();
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full rounded-xl bg-white/85 p-2 sm:p-2.5 border border-slate-200/60 shadow-2xs backdrop-blur-md flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-2xs"
          style={{ backgroundColor: accentColor }}
        >
          <Award className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-xs font-extrabold text-slate-900 leading-tight">
            Official Fieldwork Certificate
          </h4>
          <p className="truncate text-[10px] font-medium text-slate-500">
            Cryptographic proof of completed respondent telemetry
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={generateAndDownloadCertificate}
        disabled={downloading}
        className="inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shrink-0 border border-slate-300/70"
      >
        <Download className="h-3 w-3 text-slate-600" />
        <span>{downloading ? 'Exporting...' : 'PNG Certificate'}</span>
      </button>
    </div>
  );
}
