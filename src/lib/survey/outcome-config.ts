export type SurveyOutcome =
  | 'COMPLETE'
  | 'QUOTA_FULL'
  | 'TERMINATE'
  | 'QUALITY_TERM'
  | 'CLOSED'
  | 'PAUSED'
  | 'DUPLICATE_ID'
  | 'COUNTRY_MISMATCH'
  | 'SAME_IP';

export interface OutcomeConfig {
  accent: string;
  accentLight: string;
  accentText: string;
  gradient: [string, string, string];
  icon: 'Check' | 'Users' | 'FileX' | 'ShieldAlert' | 'Lock' | 'Pause' | 'UserX' | 'Globe' | 'WifiOff';
  titlePrefix: string;
  titleAccent: string;
  subtitle: string;
  description: string;
  statusPill: string;
  cta: string;
  ctaUrl: string;
  confetti: boolean;
  handwritten: string;
  soundUrl: string;
  soundTitle: string;
}

export const OUTCOME_CONFIG: Record<SurveyOutcome, OutcomeConfig> = {
  COMPLETE: {
    accent: '#22c55e',
    accentLight: '#dcfce7',
    accentText: '#16a34a',
    gradient: ['#dcfce7', '#f0fdf4', '#ecfdf5'],
    icon: 'Check',
    titlePrefix: 'Survey ',
    titleAccent: 'Complete!',
    subtitle: 'Thank you for your time!',
    description:
      'Thank you for taking the time to share your perspective. Your feedback has been securely recorded and will directly guide impactful decisions.',
    statusPill: 'Recorded',
    cta: 'Back to Home',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: true,
    handwritten: 'Your voice matters!',
    soundUrl: '/sound/complete.mp3',
    soundTitle: 'Gali Derha Hai Meme',
  },
  QUOTA_FULL: {
    accent: '#3b82f6',
    accentLight: '#dbeafe',
    accentText: '#2563eb',
    gradient: ['#dbeafe', '#eff6ff', '#e0e7ff'],
    icon: 'Users',
    titlePrefix: 'Survey ',
    titleAccent: 'Quota Full',
    subtitle: 'Thanks for your interest!',
    description:
      'We have met our target respondent quota for this demographic study. We truly appreciate your time and invite you to explore other active opportunities.',
    statusPill: 'Quota Reached',
    cta: 'Explore Other Surveys',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'We value your interest!',
    soundUrl: '/sound/quota_full.mp3',
    soundTitle: 'Arey Maa Chudi Padi Hai',
  },
  TERMINATE: {
    accent: '#ef4444',
    accentLight: '#fee2e2',
    accentText: '#dc2626',
    gradient: ['#fee2e2', '#fef2f2', '#fce7f3'],
    icon: 'FileX',
    titlePrefix: 'Survey ',
    titleAccent: 'Terminated',
    subtitle: 'This survey is no longer available.',
    description:
      'Unfortunately, based on the current criteria or quota thresholds, you were not matched to complete this session. Thank you for participating.',
    statusPill: 'Closed',
    cta: 'Back to Survey Hub',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Thank you for participating!',
    soundUrl: '/sound/terminate.mp3',
    soundTitle: 'Pehli Fursat Mein Nikal',
  },
  QUALITY_TERM: {
    accent: '#f97316',
    accentLight: '#ffedd5',
    accentText: '#ea580c',
    gradient: ['#ffedd5', '#fff7ed', '#fed7aa'],
    icon: 'ShieldAlert',
    titlePrefix: 'Survey ',
    titleAccent: 'Quality Term',
    subtitle: 'Did not pass quality validation.',
    description:
      'Your session did not fulfill automated response verification and quality benchmarks. Please provide careful, honest responses on future surveys.',
    statusPill: 'Quality Failed',
    cta: 'Back to Hub',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Integrity drives insight',
    soundUrl: '/sound/quality_term.mp3',
    soundTitle: 'Ek Jhant Bhar Ka Aadmi (CID)',
  },
  CLOSED: {
    accent: '#64748b',
    accentLight: '#e2e8f0',
    accentText: '#475569',
    gradient: ['#f1f5f9', '#f8fafc', '#e2e8f0'],
    icon: 'Lock',
    titlePrefix: 'Survey ',
    titleAccent: 'Closed',
    subtitle: 'No longer accepting responses.',
    description:
      'This survey session has officially concluded and responses are now locked. We appreciate your interest and look forward to your next visit.',
    statusPill: 'Closed',
    cta: 'Back to Home',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Stay tuned for next studies',
    soundUrl: '/sound/closed.mp3',
    soundTitle: 'Kyu Re (CID ACP Meme)',
  },
  PAUSED: {
    accent: '#eab308',
    accentLight: '#fef9c3',
    accentText: '#a16207',
    gradient: ['#fef9c3', '#fefce8', '#fef08a'],
    icon: 'Pause',
    titlePrefix: 'Project ',
    titleAccent: 'Paused',
    subtitle: 'This study is temporarily on hold.',
    description:
      'Fieldwork for this study has been temporarily paused by our research team. No new responses are being collected at this moment. Please check back shortly.',
    statusPill: 'Project Paused',
    cta: 'Back to Home',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Back in action soon!',
    soundUrl: '/sound/closed.mp3',
    soundTitle: 'Kyu Re (CID ACP Meme)',
  },
  DUPLICATE_ID: {
    accent: '#6366f1',
    accentLight: '#e0e7ff',
    accentText: '#4338ca',
    gradient: ['#e0e7ff', '#eef2ff', '#ede9fe'],
    icon: 'UserX',
    titlePrefix: 'Duplicate ',
    titleAccent: 'Identifier',
    subtitle: 'Same identifier already recorded.',
    description:
      'Our verification engine detected that this participant identifier has already taken part in this study. To ensure scientific validity, repeated attempts are restricted.',
    statusPill: 'Duplicate Entry',
    cta: 'Back to Home',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Single entry per panelist',
    soundUrl: '/sound/quality_term.mp3',
    soundTitle: 'Ek Jhant Bhar Ka Aadmi (CID)',
  },
  COUNTRY_MISMATCH: {
    accent: '#e11d48',
    accentLight: '#ffe4e6',
    accentText: '#be123c',
    gradient: ['#ffe4e6', '#fff1f2', '#fce7f3'],
    icon: 'Globe',
    titlePrefix: 'Country ',
    titleAccent: 'Mismatch',
    subtitle: 'Geographic location incompatible.',
    description:
      'This study is strictly restricted to participants living within specific target territories. Your current verified region does not match the geographic criteria.',
    statusPill: 'Region Mismatch',
    cta: 'Back to Home',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Location criteria applies',
    soundUrl: '/sound/terminate.mp3',
    soundTitle: 'Pehli Fursat Mein Nikal',
  },
  SAME_IP: {
    accent: '#d97706',
    accentLight: '#fef3c7',
    accentText: '#b45309',
    gradient: ['#fef3c7', '#fffbeb', '#ffedd5'],
    icon: 'WifiOff',
    titlePrefix: 'Network ',
    titleAccent: 'IP Cap',
    subtitle: 'Multiple sessions from this IP.',
    description:
      'A completed session was already registered from your current IP address network. To maintain unique respondent diversity, multiple submissions from the same IP are disallowed.',
    statusPill: 'Same IP Detected',
    cta: 'Back to Home',
    ctaUrl: 'https://opinioninsights.in/',
    confetti: false,
    handwritten: 'Network limit reached',
    soundUrl: '/sound/quality_term.mp3',
    soundTitle: 'Ek Jhant Bhar Ka Aadmi (CID)',
  },
};

export function resolveOutcome(val?: string | null): SurveyOutcome {
  if (!val) return 'COMPLETE';
  const clean = val.toUpperCase().trim().replace(/[\s-]+/g, '_');
  if (clean === 'PAUSE' || clean === 'PAUSED' || clean === 'PROJECT_PAUSED' || clean === 'HOLD') {
    return 'PAUSED';
  }
  if (
    clean === 'SAME_IDENTIFIER' ||
    clean === 'SAME_ID' ||
    clean === 'DUPLICATE_ID' ||
    clean === 'DUPLICATE_UID' ||
    clean === 'DUPLICATE' ||
    clean === 'DUPLICATE_IDENTIFIER'
  ) {
    return 'DUPLICATE_ID';
  }
  if (
    clean === 'COUNTRY_MISMATCH' ||
    clean === 'GEO_MISMATCH' ||
    clean === 'GEOBLOCK' ||
    clean === 'GEO_BLOCK' ||
    clean === 'GEO_FAIL' ||
    clean === 'LOCATION_MISMATCH'
  ) {
    return 'COUNTRY_MISMATCH';
  }
  if (
    clean === 'SAME_IP' ||
    clean === 'DUPLICATE_IP' ||
    clean === 'IP_LIMIT' ||
    clean === 'IP_CAP' ||
    clean === 'IP_BLOCKED' ||
    clean === 'SAME_IP_NOT_ALLOWED'
  ) {
    return 'SAME_IP';
  }
  if (
    clean === 'QUALITY_FAIL' ||
    clean === 'QUALITY_FAILED' ||
    clean === 'QUALITYFAIL' ||
    clean === 'SPEEDER' ||
    clean === 'TRAP_FAILED'
  ) {
    return 'QUALITY_TERM';
  }
  if (
    clean === 'SECURITY_REJECT' ||
    clean === 'SECURITY_FAIL' ||
    clean === 'SECURITYFAIL' ||
    clean === 'BOT_DETECTED' ||
    clean === 'VPN_BLOCKED'
  ) {
    return 'CLOSED';
  }
  const upper = clean as SurveyOutcome;
  if (upper in OUTCOME_CONFIG) {
    return upper;
  }
  return 'COMPLETE';
}

export function buildDynamicRedirectUrl(
  outcome: SurveyOutcome,
  params?: {
    customUrl?: string | null;
    pid?: string | null;
    uid?: string | null;
    projectId?: string | null;
  }
): string {
  const base = (params?.customUrl || OUTCOME_CONFIG[outcome].ctaUrl || 'https://opinioninsights.in/').trim();
  try {
    const url = new URL(base.startsWith('http') ? base : `https://${base}`);
    if (params?.pid) url.searchParams.set('pid', params.pid);
    if (params?.uid) url.searchParams.set('uid', params.uid);
    if (params?.projectId) url.searchParams.set('project_id', params.projectId);
    url.searchParams.set('outcome', outcome);
    url.searchParams.set('ts', Date.now().toString());
    return url.toString();
  } catch {
    return base;
  }
}
