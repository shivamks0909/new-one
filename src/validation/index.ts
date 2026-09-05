import { z } from 'zod';

// ─── Reusable primitives ──────────────────────────────────────────────────────

export const UuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

export const UidSchema = z
  .string()
  .min(1, 'UID is required')
  .max(255, 'UID must be 255 characters or less')
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, 'UID cannot be blank')
  .refine((v) => !/[<>"';&\x00-\x1F\x7F]/.test(v), 'UID contains invalid characters');

export const StatusSchema = z.enum([
  'COMPLETE', 'TERMINATE', 'QUOTA_FULL', 'SECURITY_REJECT', 'INVALID', 'EXPIRED', 'IN_PROGRESS',
]);

// ─── Client ───────────────────────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  client_code:   z.string().min(1).max(100),
  name:          z.string().min(1).max(255),
  company_name:  z.string().max(255).optional(),
  contact_name:  z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  notes:         z.string().optional(),
  status:        z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const UpdateClientSchema = CreateClientSchema.partial().omit({ client_code: true });

// ─── Study ────────────────────────────────────────────────────────────────────

export const CreateStudySchema = z.object({
  study_code:       z.string().min(1).max(100),
  client_id:        UuidSchema,
  title:            z.string().min(1).max(500),
  description:      z.string().optional(),
  country:          z.string().max(100).optional(),
  market:           z.string().max(100).optional(),
  language:         z.string().max(100).optional(),
  survey_url:       z.string().url('Must be a valid URL').optional().or(z.literal('')),
  survey_platform:  z.string().max(100).optional(),
  target_completes: z.number().int().min(0).default(0),
  loi_minutes:      z.number().int().min(0).default(0),
  incidence_rate:   z.number().int().min(0).max(100).default(50),
  client_cpi:       z.number().min(0).default(0),
  start_at:         z.string().datetime().optional().nullable(),
  end_at:           z.string().datetime().optional().nullable(),
  status:           z.enum(['DRAFT', 'READY', 'LIVE', 'PAUSED', 'CLOSED', 'ARCHIVED']).default('DRAFT'),
  security_level:   z.enum(['standard', 'enhanced', 'strict']).default('standard'),
});

export const UpdateStudySchema = CreateStudySchema.partial().omit({ study_code: true, client_id: true });

// ─── Vendor ───────────────────────────────────────────────────────────────────

export const CreateVendorSchema = z.object({
  vendor_code:   z.string().min(1).max(100),
  name:          z.string().min(1).max(255),
  contact_name:  z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  status:        z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes:         z.string().optional(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial().omit({ vendor_code: true });

// ─── Study Vendor Assignment ───────────────────────────────────────────────────

export const AssignVendorSchema = z.object({
  vendor_id:            UuidSchema,
  vendor_cpi:           z.number().min(0).default(0),
  target_completes:     z.number().int().min(0).default(0),
  max_completes:        z.number().int().min(0).default(0),
  status:               z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  allowed_country:      z.string().max(100).optional().nullable(),
  custom_start_url:     z.string().url().optional().nullable().or(z.literal('')),
  custom_terminate_url: z.string().url().optional().nullable().or(z.literal('')),
  custom_quota_url:     z.string().url().optional().nullable().or(z.literal('')),
  custom_complete_url:  z.string().url().optional().nullable().or(z.literal('')),
});

// ─── Tracking Link ────────────────────────────────────────────────────────────

export const CreateTrackingLinkSchema = z.object({
  study_id:            UuidSchema,
  vendor_id:           UuidSchema,
  link_code:           z.string().min(1).max(100),
  public_token:        z.string().max(255).optional(),
  base_url:            z.string().url('Must be a valid survey URL'),
  destination_url:     z.string().optional().default(''),
  uid_mode:            z.enum(['PROVIDED_UID', 'PID_AS_UID', 'GENERATED_UID']).default('PROVIDED_UID'),
  callback_profile_id: z.string().optional().nullable(),
  status:              z.enum(['ACTIVE', 'PAUSED', 'DISABLED']).default('ACTIVE'),
});

export const UpdateTrackingLinkSchema = z.object({
  status:          z.enum(['ACTIVE', 'PAUSED', 'DISABLED']).optional(),
  base_url:        z.string().url().optional(),
  destination_url: z.string().optional(),
  uid_mode:        z.enum(['PROVIDED_UID', 'PID_AS_UID', 'GENERATED_UID']).optional(),
});

// ─── Callback ─────────────────────────────────────────────────────────────────

export const CallbackSchema = z.object({
  provider:      z.string().min(1).max(100),
  study_id:      UuidSchema,
  vendor_id:     UuidSchema,
  uid:           UidSchema,
  status:        z.string().min(1).max(50),
  transactionId: z.string().max(255).optional(),
  rawPayload:    z.record(z.string(), z.unknown()).optional().default({}),
});

// ─── Quota ────────────────────────────────────────────────────────────────────

export const CreateQuotaSchema = z.object({
  study_id:      UuidSchema,
  name:          z.string().min(1).max(255),
  target:        z.number().int().min(1),
  criteria_json: z.record(z.string(), z.unknown()).optional().default({}),
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().min(1),
  password: z.string().min(1),
});

export type ValidationResult<T> =
  | { success: true; data: T; errors?: undefined }
  | { success: false; errors: string[]; data?: undefined };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, errors };
}
