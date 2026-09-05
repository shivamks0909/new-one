export interface User {
  id: string
  auth_user_id: string
  full_name?: string
  name?: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'ANALYST' | 'CLIENT'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  created_at: Date
  updated_at: Date
  last_login_at: Date | null
}

export interface Client {
  id: string
  client_code: string
  name: string
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  notes: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at: Date
  updated_at: Date
}

export interface Study {
  id: string
  study_code: string
  client_id: string
  title: string
  description: string
  country: string
  market: string
  language: string
  survey_url: string
  survey_platform: string
  target_completes: number
  loi_minutes: number
  incidence_rate: number
  client_cpi: number
  start_at: Date
  end_at: Date | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'
  security_level: string
  created_by: string
  external_offer_id?: string | null
  source_platform?: string | null
  discovery_method?: string | null
  created_at: Date
  updated_at: Date
}

export interface Vendor {
  id: string
  vendor_code: string
  name: string
  contact_name: string
  contact_email: string
  status: 'ACTIVE' | 'INACTIVE'
  notes: string
  created_at: Date
  updated_at: Date
}

export interface StudyVendor {
  id: string
  study_id: string
  vendor_id: string
  vendor_cpi: number
  target_completes: number
  max_completes: number
  status: 'ACTIVE' | 'INACTIVE'
  allowed_country: string | null
  custom_start_url: string | null
  custom_terminate_url: string | null
  custom_quota_url: string | null
  custom_complete_url: string | null
  created_at: Date
  updated_at: Date
}

export interface TrackingLink {
  id: string
  study_id: string
  vendor_id: string
  link_code: string
  public_token: string
  base_url: string
  destination_url: string
  uid_mode: 'PROVIDED_UID' | 'PID_AS_UID' | 'GENERATED_UID'
  callback_profile_id: string | null
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DISABLED'
  created_at: Date
  updated_at: Date
}

export interface Session {
  id: string
  session_token: string
  study_id: string
  vendor_id: string
  tracking_link_id: string
  uid: string
  normalized_uid: string
  external_uid: string | null
  ip_hash: string
  ip_address_encrypted_or_restricted_storage: boolean
  user_agent: string | null
  country_detected: string | null
  referrer: string | null
  landing_url: string
  initial_status: string
  current_status: string
  started_at: Date
  last_seen_at: Date
  completed_at: Date | null
  terminated_at: Date | null
  expires_at: Date
  metadata_json: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface ResponseEvent {
  id: string
  session_id: string
  study_id: string
  vendor_id: string
  uid: string
  event_type:
    | 'LANDING'
    | 'START'
    | 'REDIRECT'
    | 'CALLBACK_RECEIVED'
    | 'COMPLETE'
    | 'TERMINATE'
    | 'QUOTA_FULL'
    | 'SECURITY_REJECT'
    | 'DUPLICATE'
    | 'EXPIRED'
    | 'INVALID_REQUEST'
    | 'ERROR'
  source: string | null
  raw_payload: Record<string, any>
  normalized_payload: Record<string, any> | null
  event_key: string
  ip_address: string
  user_agent: string | null
  created_at: Date
}

export interface ResponseRecord {
  id: string
  session_id: string
  study_id: string
  vendor_id: string
  uid: string
  final_status:
    | 'IN_PROGRESS'
    | 'COMPLETE'
    | 'TERMINATE'
    | 'QUOTA_FULL'
    | 'SECURITY_REJECT'
    | 'INVALID'
    | 'EXPIRED'
  first_terminal_event: string | null
  terminal_at: Date | null
  is_counted: boolean
  counted_at: Date | null
  rejection_reason: string | null
  callback_source: string | null
  created_at: Date
  updated_at: Date
}

export interface Quota {
  id: string
  study_id: string
  name: string
  target: number
  achieved: number
  remaining: number
  status: 'OPEN' | 'LIMITED' | 'FULL' | 'CLOSED'
  criteria_json: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface AuditLog {
  id: string
  user: string
  action: string
  entity: string
  entity_id: string
  before: Record<string, any> | null
  after: Record<string, any> | null
  timestamp: Date
  ip: string | null
}