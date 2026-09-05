"use client";

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface Study {
  id: string;
  study_code: string;
  title: string;
  description: string;
  status: string;
  ls_survey_id: number | null;
  ls_survey_status: string | null;
  language: string;
  survey_url: string | null;
  target_completes: number;
  loi_minutes: number;
  client_id: string;
  created_at: string;
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  LIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  READY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CLOSED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function SurveysPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribe(() => {});
    checkAuth();
    return unsub;
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadStudies();
  }, [isAuthenticated]);

  const loadStudies = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ studies: Study[] }>('/studies');
      setStudies(data.studies || []);
    } catch {}
    setLoading(false);
  };

  return (
    <DashboardLayout
      title="Surveys"
      subtitle="Create and manage surveys for your studies"
      user={user ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id } : undefined}
      onLogout={() => { logout(); router.push('/'); }}
    >
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--accent-1)] border-t-transparent rounded-full" />
          </div>
        ) : studies.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p className="text-lg">No studies found. Create a study first.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {studies.map(s => (
              <div
                key={s.id}
                className="glass-card p-5 flex items-center justify-between cursor-pointer hover:border-[var(--accent-1)] transition-all"
                onClick={() => router.push(`/dashboard/surveys/builder?studyId=${s.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-[var(--text-primary)] font-semibold truncate">{s.title}</h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[s.status] || statusColors.DRAFT}`}>
                      {s.status}
                    </span>
                    {s.ls_survey_status && s.ls_survey_status !== 'NONE' && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        LS #{s.ls_survey_id}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)] truncate">{s.study_code} - {s.description || 'No description'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-[var(--text-muted)]">
                    <span>Language: {s.language || 'en'}</span>
                    <span>Target: {s.target_completes}</span>
                    <span>LOI: {s.loi_minutes}min</span>
                    <span>Created: {formatDate(s.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="primary" size="sm">
                    Open Builder
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
