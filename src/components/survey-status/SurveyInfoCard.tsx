'use client';

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { OutcomeConfig } from '../../lib/survey/outcome-config';
import { CopyableValue } from './CopyableValue';

interface SurveyInfoCardProps {
  pid?: string;
  uid?: string;
  ip?: string;
  loi?: string;
  projectId?: string;
  config: OutcomeConfig;
  isVerified?: boolean;
  fraudBlocked?: boolean;
}

export function SurveyInfoCard({
  pid,
  uid,
  ip,
  loi,
  projectId,
  config,
  isVerified = true,
  fraudBlocked = false,
}: SurveyInfoCardProps) {
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return 'Today';
    }
  }, []);

  const respondentId = uid || pid || 'RESP-94821';
  const resolvedProjectId = projectId || pid || 'PRJ-2026-X';
  const resolvedLoi = loi ? (loi.toLowerCase().includes('min') ? loi : `${loi} mins`) : '12 mins';
  const resolvedIp = ip
    ? (isVerified ? `${ip} (Verified Gateway)` : `${ip} (Direct Client URL)`)
    : (isVerified ? '127.0.0.1 (Verified Gateway)' : '127.0.0.1 (Direct Client Link)');

  const verificationLabel = fraudBlocked
    ? 'FRAUD BLOCKED (Terminal Locked)'
    : isVerified
    ? 'VERIFIED (Generated Link)'
    : 'UNVERIFIED (Direct Client Link)';

  return (
    <div className="w-full rounded-2xl bg-[#f8fafc]/95 p-3.5 sm:p-4 border border-slate-200/70 shadow-2xs transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-4 w-4 items-center justify-center rounded-full"
            style={{
              backgroundColor: fraudBlocked ? '#fee2e2' : !isVerified ? '#fef3c7' : config.accentLight,
            }}
          >
            <Info
              className="h-2.5 w-2.5"
              style={{
                color: fraudBlocked ? '#991b1b' : !isVerified ? '#92400e' : config.accentText,
              }}
            />
          </div>
          <h2 className="text-[11.5px] font-bold text-slate-800 uppercase tracking-wide">
            Survey Telemetry
          </h2>
        </div>

        {/* Status Pill on the Right */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-bold tracking-tight"
          style={{
            backgroundColor: fraudBlocked ? '#fee2e2' : !isVerified ? '#fef3c7' : config.accentLight,
            color: fraudBlocked ? '#991b1b' : !isVerified ? '#92400e' : config.accentText,
            border: `1px solid ${fraudBlocked ? '#fca5a5' : !isVerified ? '#fcd34d' : `${config.accent}33`}`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: fraudBlocked ? '#ef4444' : !isVerified ? '#f59e0b' : config.accent }}
          />
          {fraudBlocked ? 'BLOCKED' : !isVerified ? 'UNVERIFIED' : config.statusPill}
        </span>
      </div>

      {/* 2-Column Telemetry Grid */}
      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
        <CopyableValue label="Respondent ID" value={respondentId} />
        <CopyableValue label="Project ID" value={resolvedProjectId} />
        <CopyableValue label="Verification Status" value={verificationLabel} />
        <CopyableValue label="Length of Interview" value={resolvedLoi} />
        <CopyableValue label="Submission Date" value={formattedDate} />
        <CopyableValue label="IP Address & Origin" value={resolvedIp} />
      </div>
    </div>
  );
}
