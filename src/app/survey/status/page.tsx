import type { Metadata } from 'next';
import { StatusPage } from '@/components/survey-status/StatusPage';
import { resolveOutcome, OUTCOME_CONFIG } from '@/lib/survey/outcome-config';

interface SurveyStatusPageProps {
  searchParams: {
    outcome?: string;
    pid?: string;
    uid?: string;
    ip?: string;
    loi?: string;
    project_id?: string;
    return_url?: string;
    redirect_url?: string;
    verified?: string;
    fraud?: string;
  };
}

export async function generateMetadata({
  searchParams,
}: SurveyStatusPageProps): Promise<Metadata> {
  const outcome = resolveOutcome(searchParams?.outcome);
  const cfg = OUTCOME_CONFIG[outcome];

  return {
    title: `${cfg.titlePrefix}${cfg.titleAccent} — Opinion Insights`,
    description: cfg.description,
  };
}

export default function SurveyStatusPage({
  searchParams,
}: SurveyStatusPageProps) {
  const returnUrl = searchParams?.return_url || searchParams?.redirect_url;
  const isVerified = searchParams?.verified !== 'false' && searchParams?.verified !== '0' && searchParams?.verified !== 'unverified';
  const fraudBlocked = searchParams?.fraud === 'blocked';

  return (
    <StatusPage
      outcomeParam={searchParams?.outcome}
      pid={searchParams?.pid}
      uid={searchParams?.uid}
      ip={searchParams?.ip}
      loi={searchParams?.loi}
      projectId={searchParams?.project_id}
      returnUrl={returnUrl}
      isVerified={isVerified}
      fraudBlocked={fraudBlocked}
    />
  );
}
