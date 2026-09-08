/**
 * Opinion Insights — Reusable Redirect Status Page Component
 * Renders high-fidelity, responsive status pages matching reference designs.
 */

export interface StatusPageParams {
  statusKey: string;
  pid?: string;
  uid?: string;
  isGenuine?: boolean;
  timestamp?: string;
  loi?: string;
}

export interface StatusConfigItem {
  id: string;
  badgeIndex: number;
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  verificationBadgeText: string;
  verificationType: 'verified' | 'unverified' | 'failed';
  
  // Status Report configuration
  statusBadgeText: string;
  statusBadgeColor: string;
  statusBadgeBg: string;
  dispositionText: string;
  verificationStatusText: string;
  verificationStatusBg: string;
  verificationStatusColor: string;
  responseStatusText: string;
  responseStatusBg: string;
  responseStatusColor: string;
  processingStatusText: string;
  processingStatusBg: string;
  processingStatusColor: string;
  defaultLoi: string;
  reportSubtitle: string;
  noticeFooter?: string;

  // Illustration specifics
  iconType: 'check' | 'cross' | 'stop_hand' | 'quality_check' | 'shield_lock' | 'geoblock';
  characterState: 'happy' | 'crying' | 'quota' | 'quality' | 'security' | 'geoblock';
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  complete: {
    id: 'complete',
    badgeIndex: 0,
    eyebrow: 'Fieldwork Telemetry',
    title: 'Survey Successfully<br/>Completed!',
    description: 'Thank you for your valuable input. Your responses help us create a brighter, more informed future.',
    ctaText: 'Back to Home →',
    ctaUrl: 'https://opinioninsights.in',
    verificationBadgeText: 'This response was submitted via an unverified / direct link.',
    verificationType: 'unverified',
    statusBadgeText: 'COMPLETED',
    statusBadgeColor: '#059669',
    statusBadgeBg: '#D1FAE5',
    dispositionText: 'Complete',
    verificationStatusText: 'UNVERIFIED / DIRECT LINK',
    verificationStatusBg: '#FFEDD5',
    verificationStatusColor: '#C2410C',
    responseStatusText: 'COMPLETE',
    responseStatusBg: '#D1FAE5',
    responseStatusColor: '#059669',
    processingStatusText: 'PROCESSED',
    processingStatusBg: '#D1FAE5',
    processingStatusColor: '#059669',
    defaultLoi: '7m 24s',
    reportSubtitle: 'YOUR OPINION MAKES A DIFFERENCE',
    iconType: 'check',
    characterState: 'happy',
  },

  terminate: {
    id: 'terminate',
    badgeIndex: 1,
    eyebrow: 'Survey Update',
    title: 'Survey<br/>Terminated',
    description: 'Unfortunately, this survey session has been terminated.<br/><br/>This may happen if you did not meet the study requirements or based on the screening criteria for this project.<br/><br/>We appreciate your time and interest in sharing your opinions with us.',
    ctaText: 'Back to Home →',
    ctaUrl: 'https://opinioninsights.in',
    verificationBadgeText: 'UNVERIFIED / DIRECT LINK',
    verificationType: 'unverified',
    statusBadgeText: 'TERMINATED',
    statusBadgeColor: '#DC2626',
    statusBadgeBg: '#FEE2E2',
    dispositionText: 'Terminate',
    verificationStatusText: 'UNVERIFIED / DIRECT LINK',
    verificationStatusBg: '#FFEDD5',
    verificationStatusColor: '#C2410C',
    responseStatusText: 'INCOMPLETE',
    responseStatusBg: '#E0E7FF',
    responseStatusColor: '#3730A3',
    processingStatusText: 'PROCESSED',
    processingStatusBg: '#D1FAE5',
    processingStatusColor: '#059669',
    defaultLoi: '2m 13s',
    reportSubtitle: 'YOUR OPINION STILL MATTERS',
    noticeFooter: 'If you believe this was a mistake, please contact our support team with your Participant UID.',
    iconType: 'cross',
    characterState: 'crying',
  },

  quotafull: {
    id: 'quotafull',
    badgeIndex: 2,
    eyebrow: 'Fieldwork Telemetry',
    title: 'Quota Limit<br/>Reached',
    description: 'The target response limit for this survey has been achieved. The survey is now closed for this segment. We thank you for your participation attempt.',
    ctaText: 'Back to Home →',
    ctaUrl: 'https://opinioninsights.in',
    verificationBadgeText: 'UNVERIFIED / DIRECT LINK',
    verificationType: 'unverified',
    statusBadgeText: 'QUOTA FULL',
    statusBadgeColor: '#D97706',
    statusBadgeBg: '#FEF3C7',
    dispositionText: 'Quota Reached',
    verificationStatusText: 'UNVERIFIED',
    verificationStatusBg: '#FEF3C7',
    verificationStatusColor: '#D97706',
    responseStatusText: 'EXPIRED',
    responseStatusBg: '#FEF3C7',
    responseStatusColor: '#D97706',
    processingStatusText: 'CLOSED',
    processingStatusBg: '#FEF3C7',
    processingStatusColor: '#D97706',
    defaultLoi: '7m 24s',
    reportSubtitle: 'RESPONSES POWER A BRIGHTER TOMORROW',
    iconType: 'stop_hand',
    characterState: 'quota',
  },

  qualityfail: {
    id: 'qualityfail',
    badgeIndex: 3,
    eyebrow: 'Quality Control',
    title: 'Response Quality<br/>Check Failed',
    description: 'Our comprehensive analysis flagged this session for failing quality control filters or consistency verification. We appreciate your interest in participating.',
    ctaText: 'Back to Home →',
    ctaUrl: 'https://opinioninsights.in',
    verificationBadgeText: 'UNVERIFIED / DIRECT LINK',
    verificationType: 'unverified',
    statusBadgeText: 'QUALITY FAIL',
    statusBadgeColor: '#7C3AED',
    statusBadgeBg: '#EDE9FE',
    dispositionText: 'Quality Fail',
    verificationStatusText: 'UNVERIFIED',
    verificationStatusBg: '#FFEDD5',
    verificationStatusColor: '#C2410C',
    responseStatusText: 'FAILED',
    responseStatusBg: '#FEE2E2',
    responseStatusColor: '#DC2626',
    processingStatusText: 'REVIEWED',
    processingStatusBg: '#EDE9FE',
    processingStatusColor: '#7C3AED',
    defaultLoi: '1m 45s',
    reportSubtitle: 'QUALITY METRICS TELEMETRY',
    noticeFooter: 'Flagged by automated data-integrity and anti-fraud verification filters.',
    iconType: 'quality_check',
    characterState: 'quality',
  },

  securityfail: {
    id: 'securityfail',
    badgeIndex: 4,
    eyebrow: 'Security Validation',
    title: 'Security Check<br/>Failed',
    description: 'Security and integrity validation checks failed for this session. Direct access or automated parameters were blocked to ensure data quality.',
    ctaText: 'Back to Home →',
    ctaUrl: 'https://opinioninsights.in',
    verificationBadgeText: 'SECURITY VALIDATION FAILED',
    verificationType: 'failed',
    statusBadgeText: 'SECURITY FAIL',
    statusBadgeColor: '#DC2626',
    statusBadgeBg: '#FEE2E2',
    dispositionText: 'Security Fail',
    verificationStatusText: 'FAILED',
    verificationStatusBg: '#FEE2E2',
    verificationStatusColor: '#DC2626',
    responseStatusText: 'BLOCKED',
    responseStatusBg: '#FEE2E2',
    responseStatusColor: '#DC2626',
    processingStatusText: 'CLOSED',
    processingStatusBg: '#F1F5F9',
    processingStatusColor: '#475569',
    defaultLoi: '0m 32s',
    reportSubtitle: 'SECURITY INTEGRITY SYSTEM',
    noticeFooter: 'Automated security filters detected anomalous connection signatures.',
    iconType: 'shield_lock',
    characterState: 'security',
  },

  geoblock: {
    id: 'geoblock',
    badgeIndex: 5,
    eyebrow: 'Geographic Eligibility',
    title: 'Participation<br/>Unavailable',
    description: 'This survey study is restricted to participants in specific geographic regions. Your location is outside the active sampling area for this study.',
    ctaText: 'Back to Home →',
    ctaUrl: 'https://opinioninsights.in',
    verificationBadgeText: 'GEOGRAPHIC RESTRICTION',
    verificationType: 'unverified',
    statusBadgeText: 'GEO BLOCK',
    statusBadgeColor: '#0284C7',
    statusBadgeBg: '#E0F2FE',
    dispositionText: 'Geographic Restriction',
    verificationStatusText: 'UNVERIFIED',
    verificationStatusBg: '#FFEDD5',
    verificationStatusColor: '#C2410C',
    responseStatusText: 'BLOCKED',
    responseStatusBg: '#FEE2E2',
    responseStatusColor: '#DC2626',
    processingStatusText: 'CLOSED',
    processingStatusBg: '#F1F5F9',
    processingStatusColor: '#475569',
    defaultLoi: '0m 15s',
    reportSubtitle: 'GEOGRAPHIC SAMPLING REGION',
    noticeFooter: 'Sampling criteria require participants to originate from approved geographic regions.',
    iconType: 'geoblock',
    characterState: 'geoblock',
  },
};

// SVG Illustration Generator for the right curved hero area
function renderIllustrationSvg(config: StatusConfigItem): string {
  const { iconType, characterState } = config;

  // Render floating status icon
  let floatingIconSvg = '';
  if (iconType === 'check') {
    floatingIconSvg = `
      <g transform="translate(195, 12)">
        <circle cx="32" cy="32" r="32" fill="#10B981" />
        <path d="M22 32 L29 39 L43 23" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- yellow rays -->
        <line x1="8" y1="18" x2="2" y2="12" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />
        <line x1="56" y1="18" x2="62" y2="12" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />
        <line x1="4" y1="36" x2="-3" y2="36" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />
        <line x1="60" y1="36" x2="67" y2="36" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />
      </g>`;
  } else if (iconType === 'cross') {
    floatingIconSvg = `
      <g transform="translate(195, 15)">
        <circle cx="30" cy="30" r="30" fill="#EF4444" />
        <path d="M20 20 L40 40 M40 20 L20 40" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" />
      </g>`;
  } else if (iconType === 'stop_hand') {
    floatingIconSvg = `
      <g transform="translate(195, 12)">
        <circle cx="30" cy="30" r="30" fill="#F59E0B" />
        <rect x="22" y="16" width="16" height="26" rx="4" fill="#FFFFFF" />
        <line x1="30" y1="16" x2="30" y2="40" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" />
        <line x1="26" y1="22" x2="26" y2="38" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" />
        <line x1="34" y1="22" x2="34" y2="38" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" />
      </g>`;
  } else if (iconType === 'quality_check') {
    floatingIconSvg = `
      <g transform="translate(195, 15)">
        <circle cx="30" cy="30" r="30" fill="#8B5CF6" />
        <path d="M20 22 L26 22 M20 30 L34 30 M20 38 L30 38" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
        <path d="M36 20 L40 24 L48 16" fill="none" stroke="#34D399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      </g>`;
  } else if (iconType === 'shield_lock') {
    floatingIconSvg = `
      <g transform="translate(195, 15)">
        <circle cx="30" cy="30" r="30" fill="#DC2626" />
        <path d="M30 16 L42 21.5 V31 C42 38 30 43 30 43 C30 43 18 38 18 31 V21.5 L30 16 Z" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <rect x="24" y="27" width="12" height="10" rx="2" fill="#FFFFFF" />
        <path d="M26 27 V24 C26 21.8 27.8 20 30 20 C32.2 20 34 21.8 34 24 V27" fill="none" stroke="#FFFFFF" stroke-width="2.5" />
      </g>`;
  } else {
    // geoblock
    floatingIconSvg = `
      <g transform="translate(195, 15)">
        <circle cx="30" cy="30" r="30" fill="#0284C7" />
        <circle cx="30" cy="30" r="18" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <ellipse cx="30" cy="30" rx="10" ry="18" fill="none" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="12" y1="30" x2="48" y2="30" stroke="#FFFFFF" stroke-width="2.5" />
        <path d="M30 18 C30 18 24 24 24 28 C24 31.3 26.7 34 30 34 C33.3 34 36 31.3 36 28 C36 24 30 18 30 18 Z" fill="#EF4444" />
      </g>`;
  }

  // Front-facing Character illustrations matching reference screenshots
  let characterSvg = '';
  if (characterState === 'happy') {
    characterSvg = `
      <!-- Beanbag chair -->
      <path d="M100 160 C100 105, 240 105, 250 160 C255 195, 220 225, 175 225 C130 225, 95 195, 100 160 Z" fill="#7C3AED" />

      <!-- Legs cross-legged -->
      <path d="M125 185 C125 210, 225 210, 225 185" fill="none" stroke="#1E1B4B" stroke-width="16" stroke-linecap="round" />

      <!-- Torso in coral shirt -->
      <path d="M155 135 L165 185 L185 185 L195 135 Z" fill="#FF5838" />

      <!-- Long dark hair behind body -->
      <path d="M152 98 C152 75, 198 75, 198 98 C206 125, 196 160, 196 160 L154 160 C154 160, 144 125, 152 98 Z" fill="#1E152A" />

      <!-- Face head & skin -->
      <circle cx="175" cy="108" r="16" fill="#FCD34D" />
      <!-- Bangs -->
      <path d="M161 98 C166 90, 184 90, 189 98 C182 102, 168 102, 161 98 Z" fill="#1E152A" />
      <!-- Eyes & Smile -->
      <circle cx="169" cy="107" r="2" fill="#1E152A" />
      <circle cx="181" cy="107" r="2" fill="#1E152A" />
      <path d="M170 114 Q175 120 180 114" fill="none" stroke="#1E152A" stroke-width="2" stroke-linecap="round" />

      <!-- Arms raised in victory 🙌 -->
      <path d="M160 142 L135 110 L122 85" fill="none" stroke="#FCD34D" stroke-width="7" stroke-linecap="round" />
      <path d="M190 142 L215 110 L228 85" fill="none" stroke="#FCD34D" stroke-width="7" stroke-linecap="round" />

      <!-- Laptop on lap -->
      <rect x="145" y="162" width="60" height="28" rx="4" fill="#E2E8F0" />
      <polygon points="140,190 210,190 205,194 145,194" fill="#94A3B8" />
      <circle cx="175" cy="176" r="5" fill="#10B981" />
      <path d="M172 176 L174 178 L179 173" fill="none" stroke="#FFFFFF" stroke-width="1.5" />
    `;
  } else if (characterState === 'crying') {
    characterSvg = `
      <!-- Beanbag chair -->
      <path d="M100 160 C100 105, 240 105, 250 160 C255 195, 220 225, 175 225 C130 225, 95 195, 100 160 Z" fill="#7C3AED" />

      <!-- Knees pulled up in dark pants -->
      <path d="M135 170 C125 195, 150 215, 175 215 C200 215, 225 195, 215 170 Z" fill="#1E1B4B" />

      <!-- Coral Shirt -->
      <path d="M155 140 L160 180 L190 180 L195 140 Z" fill="#FF5838" />

      <!-- Long dark hair -->
      <path d="M152 102 C152 80, 198 80, 198 102 C206 125, 196 155, 196 155 L154 155 C154 155, 144 125, 152 102 Z" fill="#1E152A" />

      <!-- Head & Face -->
      <circle cx="175" cy="112" r="16" fill="#FCD34D" />

      <!-- Hands covering face -->
      <path d="M152 150 L164 122 L172 122" fill="none" stroke="#FCD34D" stroke-width="6" stroke-linecap="round" />
      <path d="M198 150 L186 122 L178 122" fill="none" stroke="#FCD34D" stroke-width="6" stroke-linecap="round" />

      <!-- Sad eyes & Tears -->
      <path d="M168 110 Q170 107 172 110" fill="none" stroke="#1E152A" stroke-width="1.8" />
      <path d="M178 110 Q180 107 182 110" fill="none" stroke="#1E152A" stroke-width="1.8" />
      <circle cx="167" cy="116" r="2.5" fill="#60A5FA" />
      <circle cx="183" cy="116" r="2.5" fill="#60A5FA" />
      <path d="M167 118 V126" stroke="#60A5FA" stroke-width="1.2" stroke-dasharray="2,2" />
      <path d="M183 118 V126" stroke="#60A5FA" stroke-width="1.2" stroke-dasharray="2,2" />

      <!-- Laptop on floor closed -->
      <rect x="210" y="180" width="45" height="24" rx="3" fill="#CBD5E1" transform="rotate(12 210 180)" />
    `;
  } else if (characterState === 'quota') {
    characterSvg = `
      <!-- Rain cloud overhead -->
      <g transform="translate(130, 48)">
        <path d="M10 20 Q10 8 26 8 Q36 -2 52 8 Q68 2 78 16 Q88 18 88 28 Q88 38 72 38 L10 38 Z" fill="#94A3B8" opacity="0.85" />
        <!-- raindrops -->
        <line x1="20" y1="42" x2="16" y2="54" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" />
        <line x1="42" y1="42" x2="38" y2="58" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" />
        <line x1="64" y1="42" x2="60" y2="53" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" />
        <line x1="80" y1="42" x2="76" y2="55" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" />
      </g>

      <!-- Beanbag chair -->
      <path d="M100 160 C100 105, 240 105, 250 160 C255 195, 220 225, 175 225 C130 225, 95 195, 100 160 Z" fill="#7C3AED" />

      <!-- Legs in dark pants -->
      <path d="M135 180 L160 215 L190 215 L215 180 Z" fill="#1E1B4B" />
      <path d="M155 140 L160 180 L190 180 L195 140 Z" fill="#FF5838" />

      <!-- Long hair -->
      <path d="M152 105 C152 85, 198 85, 198 105 C206 125, 196 155, 196 155 L154 155 Z" fill="#1E152A" />

      <!-- Head & face disappointed -->
      <circle cx="175" cy="115" r="16" fill="#FCD34D" />
      <circle cx="169" cy="114" r="2" fill="#1E152A" />
      <circle cx="181" cy="114" r="2" fill="#1E152A" />
      <path d="M170 122 Q175 117 180 122" fill="none" stroke="#1E152A" stroke-width="2" stroke-linecap="round" />

      <!-- Laptop on lap -->
      <rect x="150" y="165" width="50" height="24" rx="3" fill="#E2E8F0" />
    `;
  } else {
    // Quality / Security / Geoblock general vector scene
    characterSvg = `
      <!-- Beanbag chair -->
      <path d="M100 160 C100 105, 240 105, 250 160 C255 195, 220 225, 175 225 C130 225, 95 195, 100 160 Z" fill="#7C3AED" />

      <!-- Legs -->
      <path d="M135 180 L160 215 L190 215 L215 180 Z" fill="#1E1B4B" />
      <path d="M155 140 L160 180 L190 180 L195 140 Z" fill="#FF5838" />
      <path d="M152 105 C152 85, 198 85, 198 105 C206 125, 196 155, 196 155 L154 155 Z" fill="#1E152A" />
      <circle cx="175" cy="115" r="16" fill="#FCD34D" />
      <circle cx="169" cy="114" r="2" fill="#1E152A" />
      <circle cx="181" cy="114" r="2" fill="#1E152A" />
      <path d="M170 122 Q175 117 180 122" fill="none" stroke="#1E152A" stroke-width="2" stroke-linecap="round" />

      <!-- Laptop -->
      <rect x="148" y="160" width="54" height="26" rx="4" fill="#E2E8F0" />
      <rect x="152" y="164" width="46" height="18" fill="#1E293B" />
      <circle cx="175" cy="173" r="4" fill="#EF4444" />
    `;
  }

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 260" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <defs>
      <clipPath id="archClip">
        <path d="M30 260 V120 C30 40, 100 10, 170 10 C240 10, 310 40, 310 120 V260 Z" />
      </clipPath>
    </defs>

    <!-- Curved Arch Background Container -->
    <path d="M20 260 V120 C20 30, 95 0, 170 0 C245 0, 320 30, 320 120 V260 Z" fill="#F1F5FE" />

    <g clip-path="url(#archClip)">
      <!-- Background Window -->
      <rect x="230" y="45" width="70" height="90" rx="8" fill="#FFFFFF" opacity="0.6" stroke="#CBD5E1" stroke-width="2" />
      <line x1="265" y1="45" x2="265" y2="135" stroke="#CBD5E1" stroke-width="1.5" />
      <line x1="230" y1="90" x2="300" y2="90" stroke="#CBD5E1" stroke-width="1.5" />
      <!-- Soft Leaf behind window -->
      <path d="M275 60 C290 60, 295 80, 280 95 C270 90, 265 75, 275 60 Z" fill="#C7D2FE" opacity="0.7" />

      <!-- Houseplant on left -->
      <path d="M40 220 L50 260 L85 260 L95 220 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" /> <!-- Pot -->
      <!-- Leaves -->
      <path d="M67 220 C40 180, 30 140, 45 110 C65 140, 70 180, 67 220 Z" fill="#10B981" />
      <path d="M67 220 C60 170, 70 130, 95 100 C100 135, 85 185, 67 220 Z" fill="#059669" />
      <path d="M67 220 C85 185, 115 160, 125 135 C115 170, 90 200, 67 220 Z" fill="#047857" />

      <!-- Side Table on right -->
      <path d="M245 190 L240 260 M295 190 L300 260" stroke="#78350F" stroke-width="4" stroke-linecap="round" />
      <rect x="235" y="180" width="70" height="12" rx="3" fill="#B45309" />
      <!-- Books on table -->
      <rect x="250" y="168" width="40" height="6" rx="1" fill="#F59E0B" />
      <rect x="248" y="174" width="44" height="6" rx="1" fill="#7C3AED" />

      ${characterSvg}
    </g>

    ${floatingIconSvg}
  </svg>`;
}

/**
 * Main HTML Renderer function for Opinion Insights Redirect Status Pages
 */
export function renderRedirectStatusPage(params: StatusPageParams): string {
  const {
    statusKey,
    pid = 'fwdw42',
    uid = 'P-12345',
    isGenuine = false,
    timestamp,
    loi
  } = params;

  // Resolve config or fallback to complete
  const normalizedKey = (statusKey || 'complete').toLowerCase();
  const configKey = STATUS_CONFIG[normalizedKey] ? normalizedKey : (
    normalizedKey.includes('term') ? 'terminate' :
    normalizedKey.includes('quota') ? 'quotafull' :
    normalizedKey.includes('qual') ? 'qualityfail' :
    normalizedKey.includes('sec') ? 'securityfail' :
    normalizedKey.includes('geo') ? 'geoblock' : 'complete'
  );

  const config = STATUS_CONFIG[configKey];

  const formattedTimestamp = timestamp || new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedLoi = loi || config.defaultLoi;

  // Pagination dots HTML (6 total)
  const dotRoutes = [
    '/redirect/complete',
    '/redirect/terminate',
    '/redirect/quotafull',
    '/redirect/qualityfail',
    '/redirect/securityfail',
    '/redirect/geoblock'
  ];

  const paginationDotsHtml = dotRoutes.map((route, idx) => {
    const isActive = idx === config.badgeIndex;
    const url = `${route}?pid=${encodeURIComponent(pid)}&uid=${encodeURIComponent(uid)}`;
    return `
      <a href="${url}" class="dot-link ${isActive ? 'active' : ''}" title="View State ${idx + 1}">
        <span class="dot-inner"></span>
      </a>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opinion Insights — ${config.eyebrow}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-lavender: #EBF0FE;
      --hero-coral: #FA5337;
      --hero-shadow: rgba(250, 83, 55, 0.28);
      --navy-dark: #1E152A;
      --navy-hover: #2E2240;
      --text-white: #FFFFFF;
      --text-muted: rgba(255, 255, 255, 0.9);
      --card-white: #FFFFFF;
      --border-gray: #E2E8F0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-lavender);
      color: var(--navy-dark);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 16px;
      overflow-x: hidden;
    }

    .viewport-wrapper {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
    }

    /* Main Hero Coral Container */
    .hero-container {
      background-color: var(--hero-coral);
      border-radius: 36px;
      box-shadow: 0 24px 60px var(--hero-shadow);
      padding: 32px 48px 40px 48px;
      color: var(--text-white);
      position: relative;
      overflow: hidden;
    }

    /* Header Navigation */
    .top-header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 36px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
    }

    .hamburger-icon {
      width: 20px;
      height: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .hamburger-icon span {
      display: block;
      height: 2.5px;
      width: 100%;
      background-color: #FFFFFF;
      border-radius: 2px;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #FFFFFF;
    }

    .brand-logo-icon {
      width: 32px;
      height: 32px;
      background: #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-logo-icon svg {
      width: 18px;
      height: 18px;
      fill: var(--hero-coral);
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 0.95rem;
      font-weight: 700;
    }

    .header-link {
      color: #FFFFFF;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Grid Layout */
    .hero-content-grid {
      display: grid;
      grid-template-columns: 1fr 520px;
      gap: 40px;
      align-items: start;
      position: relative;
    }

    /* Left Content Column */
    .left-column {
      display: flex;
      flex-direction: column;
      z-index: 2;
    }

    .eyebrow-label {
      font-size: 1.0625rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.92);
      margin-bottom: 12px;
      letter-spacing: 0.01em;
    }

    .hero-headline {
      font-size: 3.75rem;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -0.025em;
      color: #FFFFFF;
      margin-bottom: 20px;
    }

    .hero-description {
      font-size: 1.0625rem;
      line-height: 1.6;
      color: var(--text-muted);
      max-width: 540px;
      margin-bottom: 32px;
      font-weight: 500;
    }

    .actions-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }

    .cta-button {
      background-color: var(--navy-dark);
      color: #FFFFFF;
      font-size: 1rem;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 99px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 8px 20px rgba(30, 21, 42, 0.25);
    }

    .cta-button:hover {
      background-color: var(--navy-hover);
      transform: translateY(-2px);
    }

    .verification-pill {
      background: rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #FFFFFF;
      padding: 10px 20px;
      border-radius: 99px;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    /* Pagination Dots */
    .pagination-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: auto;
    }

    .dot-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      text-decoration: none;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.6);
      transition: all 0.2s ease;
    }

    .dot-link.active {
      border: 2.5px solid #FFFFFF;
      width: 18px;
      height: 18px;
    }

    .dot-link.active .dot-inner {
      background-color: transparent;
      width: 0;
      height: 0;
    }

    /* Right Illustration & Status Report Column */
    .right-column {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .illustration-card {
      width: 100%;
      height: 280px;
      position: relative;
    }

    /* Status Report Card (Overlapping lower right) */
    .status-report-card {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 20px 24px;
      color: var(--navy-dark);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
      width: 100%;
      margin-top: -50px;
      position: relative;
      z-index: 10;
    }

    .report-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border-gray);
      margin-bottom: 16px;
    }

    .report-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--navy-dark);
    }

    .report-card-subtitle {
      font-size: 0.7rem;
      font-weight: 800;
      color: #8E95AD;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* 3-Column Report Grid */
    .report-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px 20px;
    }

    .report-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      font-size: 0.6875rem;
      font-weight: 800;
      color: #8E95AD;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .field-value-text {
      font-size: 0.9375rem;
      font-weight: 800;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      width: fit-content;
      text-transform: uppercase;
    }

    .status-pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }

    .notice-footer-bar {
      margin-top: 14px;
      padding: 10px 14px;
      background-color: #F1F5F9;
      border-radius: 10px;
      font-size: 0.775rem;
      color: #475569;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Responsive Breakpoints */
    @media (max-width: 1024px) {
      .hero-container { padding: 28px 32px; }
      .hero-content-grid { grid-template-columns: 1fr; gap: 32px; }
      .hero-headline { font-size: 3rem; }
      .status-report-card { margin-top: 0; }
    }

    @media (max-width: 640px) {
      body { padding: 12px 8px; }
      .hero-container { padding: 20px 20px 28px 20px; border-radius: 24px; }
      .hero-headline { font-size: 2.25rem; }
      .top-header { margin-bottom: 24px; }
      .report-grid { grid-template-columns: 1fr; gap: 14px; }
      .brand-title { font-size: 1.1rem; }
      .header-right span { display: none; }
      .actions-row { flex-direction: column; align-items: stretch; }
      .cta-button { justify-content: center; }
      .verification-pill { justify-content: center; }
    }
  </style>
</head>
<body>

<div class="viewport-wrapper">
  <div class="hero-container">

    <!-- Top Header -->
    <header class="top-header">
      <a href="https://opinioninsights.in" class="header-brand">
        <div class="brand-logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M4 19h16v2H4v-2zm2-4h3v2H6v-2zm5-4h3v6h-3v-6zm5-5h3v11h-3V6z"/>
          </svg>
        </div>
        <span class="brand-title">Opinion Insights</span>
      </a>
    </header>

    <!-- Main Content Grid -->
    <div class="hero-content-grid">

      <!-- Left Column -->
      <div class="left-column">
        <span class="eyebrow-label">${config.eyebrow}</span>
        <h1 class="hero-headline">${config.title}</h1>
        <p class="hero-description">${config.description}</p>

        <div class="actions-row">
          <a href="${config.ctaUrl}" class="cta-button">
            ${config.ctaText}
          </a>
          <span class="verification-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            ${config.verificationBadgeText}
          </span>
        </div>

        <!-- 6 Pagination Dots -->
        <div class="pagination-container">
          ${paginationDotsHtml}
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <div class="illustration-card">
          ${renderIllustrationSvg(config)}
        </div>

        <!-- Status Report Card -->
        <div class="status-report-card">
          <div class="report-card-header">
            <div class="report-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E152A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Status Report</span>
            </div>
            <span class="report-card-subtitle">${config.reportSubtitle}</span>
          </div>

          <div class="report-grid">
            <!-- Row 1 -->
            <div class="report-field">
              <span class="field-label">SURVEY STATUS</span>
              <span class="status-pill" style="background-color: ${config.statusBadgeBg}; color: ${config.statusBadgeColor};">
                <span class="status-pill-dot"></span>
                ${config.statusBadgeText}
              </span>
            </div>

            <div class="report-field">
              <span class="field-label">DISPOSITION</span>
              <span class="field-value-text">${config.dispositionText}</span>
            </div>

            <div class="report-field">
              <span class="field-label">VERIFICATION STATUS</span>
              <span class="status-pill" style="background-color: ${config.verificationStatusBg}; color: ${config.verificationStatusColor};">
                <span class="status-pill-dot"></span>
                ${config.verificationStatusText}
              </span>
            </div>

            <!-- Row 2 -->
            <div class="report-field">
              <span class="field-label">PROJECT CODE</span>
              <span class="field-value-text" id="disp-pid">${pid}</span>
            </div>

            <div class="report-field">
              <span class="field-label">PARTICIPANT UID</span>
              <span class="field-value-text" id="disp-uid">${uid}</span>
            </div>

            <div class="report-field">
              <span class="field-label">RESPONSE STATUS</span>
              <span class="status-pill" style="background-color: ${config.responseStatusBg}; color: ${config.responseStatusColor};">
                <span class="status-pill-dot"></span>
                ${config.responseStatusText}
              </span>
            </div>

            <!-- Row 3 -->
            <div class="report-field">
              <span class="field-label">PROCESSING STATUS</span>
              <span class="status-pill" style="background-color: ${config.processingStatusBg}; color: ${config.processingStatusColor};">
                <span class="status-pill-dot"></span>
                ${config.processingStatusText}
              </span>
            </div>

            <div class="report-field">
              <span class="field-label">TIMESTAMP</span>
              <span class="field-value-text">${formattedTimestamp}</span>
            </div>

            <div class="report-field">
              <span class="field-label">LOI DURATION</span>
              <span class="field-value-text">${formattedLoi}</span>
            </div>
          </div>

          ${config.noticeFooter ? `
          <div class="notice-footer-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>${config.noticeFooter}</span>
          </div>` : ''}
        </div>

      </div>

    </div>

  </div>
</div>

</body>
</html>`;
}
