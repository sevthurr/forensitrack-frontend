import { supabase } from '../lib/supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export class ApiError extends Error {
  status: number
  detail: string
  data?: any

  constructor(status: number, detail: string, data?: any) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.data = data
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  asBlob?: boolean
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers = {}, asBlob, ...rest } = options
  
  let url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
  
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  const reqHeaders = new Headers(headers)

  // Attach Supabase access token if available and not already provided
  if (!reqHeaders.has('Authorization')) {
    const token = await getAccessToken()
    if (token) {
      reqHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  // Only set Content-Type to JSON if body is not FormData or Blob
  if (rest.body && !(rest.body instanceof FormData) && !(rest.body instanceof Blob)) {
    if (!reqHeaders.has('Content-Type')) {
      reqHeaders.set('Content-Type', 'application/json')
    }
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...rest,
      headers: reqHeaders,
    })
  } catch (err: any) {
    throw new ApiError(0, err.message || 'Network request failed. Is the backend server running?')
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    let data: any = null
    try {
      const errorJson = await response.json()
      data = errorJson
      if (typeof errorJson.detail === 'string') {
        detail = errorJson.detail
      } else if (Array.isArray(errorJson.detail)) {
        // FastAPI 422 validation errors
        detail = errorJson.detail.map((d: any) => `${d.loc?.join('.') || 'field'}: ${d.msg}`).join(', ')
      } else if (errorJson.message) {
        detail = errorJson.message
      }
    } catch {
      // Non-JSON error body
      try {
        const text = await response.text()
        if (text) detail = text.slice(0, 300)
      } catch {
        // ignore
      }
    }

    if (response.status === 401) {
      // Trigger logout if token expired
      console.warn('API returned 401 Unauthorized for:', url)
    }

    throw new ApiError(response.status, detail, data)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  if (asBlob) {
    return response.blob() as unknown as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>
  }
  
  if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream') || contentType.includes('image/')) {
    return response.blob() as unknown as T
  }

  return response.text() as unknown as T
}

/* ==================== Types ==================== */

export interface UserProfile {
  id: string
  full_name: string
  role: 'administrator' | 'investigator'
  is_active: boolean
  onboarding_status?: 'invited' | 'password_set' | 'completed'
  invited_at?: string | null
  password_set_at?: string | null
  onboarding_completed_at?: string | null
  aal?: 'aal1' | 'aal2'
  created_at: string
  updated_at: string
}

export interface UserListItem {
  id: string
  email: string
  full_name: string
  role: 'administrator' | 'investigator'
  is_active: boolean
  onboarding_status?: 'invited' | 'password_set' | 'completed'
  invited_at?: string | null
  password_set_at?: string | null
  onboarding_completed_at?: string | null
  aal?: 'aal1' | 'aal2'
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_cases: number
  open_cases: number
  in_progress_cases: number
  closed_cases: number
  total_evidence: number
  cases_by_status: { status: string; count: number }[]
  evidence_by_type: { file_type: string; count: number }[]
  recent_activity: {
    id: string
    action: string
    entity_type: string
    entity_id?: string | null
    actor_name?: string | null
    created_at: string
    details: Record<string, any>
  }[]
}

export interface CaseItem {
  id: string
  case_number: string
  title: string
  description?: string | null
  status: 'open' | 'in_progress' | 'closed'
  created_by: string
  investigator_id?: string | null
  created_at: string
  updated_at: string
}

export interface CaseDetail extends CaseItem {
  assigned_investigators: {
    investigator_id: string
    full_name: string
    assigned_by: string
    assigned_at: string
  }[]
}

export interface CaseListResult {
  total: number
  items: CaseItem[]
}

export interface CaseNoteItem {
  id: string
  case_id: string
  author_id: string
  author_name?: string | null
  content: string
  created_at: string
}

export interface EvidenceItem {
  id: string
  case_id: string
  evidence_number: string
  original_filename: string
  file_type?: string | null
  file_size: number
  storage_path: string
  sha256_hash: string
  source_description?: string | null
  collected_by: string
  collected_by_name?: string | null
  collected_at: string
  registered_by: string
  registered_by_name?: string | null
  current_custodian: string
  current_custodian_name?: string | null
  created_at: string
}

export interface VerificationItem {
  id: string
  evidence_id: string
  verified_by: string
  verifier_name?: string | null
  verification_type: 'stored' | 'uploaded'
  expected_hash: string
  calculated_hash: string
  is_valid: boolean
  verified_at: string
  notes?: string | null
}

export interface CustodyTransferItem {
  id: string
  evidence_id: string
  evidence_number?: string | null
  from_custodian: string
  from_custodian_name?: string | null
  to_custodian: string
  to_custodian_name?: string | null
  transferred_by: string
  transferred_by_name?: string | null
  transfer_reason: string
  transferred_at: string
}

export interface AuditLogItem {
  id: string
  actor_id: string
  actor_name?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  details: Record<string, any>
  created_at: string
}

/* ==================== API Methods ==================== */

export const api = {
  // Authentication
  auth: {
    getMe: (token?: string) =>
      request<UserProfile>('/api/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    checkAdmin: () => request<{ message: string; role: string }>('/api/auth/admin-check'),
    checkInvestigator: () => request<{ message: string; role: string }>('/api/auth/investigator-check'),
    logEvent: (event: 'USER_LOGOUT' | 'PASSWORD_CHANGED') =>
      request<void>('/api/auth/audit-event', { method: 'POST', body: JSON.stringify({ event }) }),
    setupPassword: (password: string, confirmPassword: string) =>
      request<UserProfile>('/api/auth/setup-password', {
        method: 'POST',
        body: JSON.stringify({ password, confirm_password: confirmPassword }),
      }),
    completeMfaLogin: (action: 'enroll' | 'verify', token?: string) =>
      request<UserProfile>('/api/auth/mfa/complete', {
        method: 'POST',
        body: JSON.stringify({ action }),
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      }),
    activate: (token?: string) =>
      request<UserProfile>('/api/auth/activate', {
        method: 'POST',
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      }),
  },

  // Dashboard
  dashboard: {
    getStats: () => request<DashboardStats>('/api/dashboard/stats'),
  },

  // Cases
  cases: {
    list: (params?: { search?: string; status?: string; skip?: number; limit?: number }) =>
      request<CaseListResult>('/api/cases', { params }),
    get: (id: string) => request<CaseDetail>(`/api/cases/${id}`),
    create: (data: { case_number: string; title: string; description?: string }) =>
      request<CaseItem>('/api/cases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; description?: string }) =>
      request<CaseItem>(`/api/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: 'open' | 'in_progress' | 'closed') =>
      request<CaseItem>(`/api/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getAssignments: (caseId: string) =>
      request<CaseDetail['assigned_investigators']>(`/api/cases/${caseId}/assignments`),
    assignInvestigator: (caseId: string, investigatorId: string) =>
      request<any>(`/api/cases/${caseId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ investigator_id: investigatorId }),
      }),
    unassignInvestigator: (caseId: string, investigatorId: string) =>
      request<void>(`/api/cases/${caseId}/assignments/${investigatorId}`, { method: 'DELETE' }),
    getNotes: (caseId: string) => request<CaseNoteItem[]>(`/api/cases/${caseId}/notes`),
    addNote: (caseId: string, content: string) =>
      request<CaseNoteItem>(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  },

  // Evidence
  evidence: {
    list: (params?: { case_id?: string; skip?: number; limit?: number }) =>
      request<{ total: number; items: EvidenceItem[] }>('/api/evidence', { params }),
    get: (id: string) => request<EvidenceItem>(`/api/evidence/${id}`),
    register: (formData: FormData) =>
      request<EvidenceItem>('/api/evidence', { method: 'POST', body: formData }),
    download: (id: string) =>
      request<Blob>(`/api/evidence/${id}/download`, { asBlob: true }),
    preview: (id: string) =>
      request<Blob>(`/api/evidence/${id}/preview`, { asBlob: true }),
    getHash: (id: string) =>
      request<{ evidence_id: string; evidence_number: string; sha256_hash: string }>(`/api/evidence/${id}/hash`),
    verifyStored: (id: string) =>
      request<VerificationItem>(`/api/evidence/${id}/verify-stored`, { method: 'POST' }),
    verifyUpload: (id: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return request<VerificationItem>(`/api/evidence/${id}/verify-upload`, { method: 'POST', body: formData })
    },
    getVerificationHistory: (id: string) =>
      request<VerificationItem[]>(`/api/evidence/${id}/verification-history`),
  },

  // Chain of Custody
  custody: {
    getEvidenceCustody: (evidenceId: string) =>
      request<CustodyTransferItem[]>(`/api/custody/evidence/${evidenceId}`),
    getCaseCustody: (caseId: string) =>
      request<CustodyTransferItem[]>(`/api/custody/cases/${caseId}`),
    transfer: (data: {
      evidence_id: string
      to_custodian: string
      transfer_reason: string
    }) =>
      request<CustodyTransferItem>('/api/custody/transfer', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Users
  users: {
    list: (params?: { role?: string; is_active?: boolean; skip?: number; limit?: number }) =>
      request<{ total: number; items: UserListItem[] }>('/api/users', { params }),
    get: (id: string) => request<UserListItem>(`/api/users/${id}`),
    create: (data: { email: string; full_name: string; role: 'administrator' | 'investigator' }) =>
      request<UserListItem>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    resendInvite: (id: string) =>
      request<UserListItem>(`/api/users/${id}/resend-invite`, { method: 'POST' }),
    resetMfa: (id: string) =>
      request<UserListItem>(`/api/users/${id}/reset-mfa`, { method: 'POST' }),
    update: (id: string, data: { full_name?: string; role?: 'administrator' | 'investigator' }) =>
      request<UserListItem>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateStatus: (id: string, is_active: boolean) =>
      request<UserListItem>(`/api/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    getProfileMe: () => request<UserProfile>('/api/users/profile/me'),
    updateProfileMe: (data: { full_name: string; email?: string }) =>
      request<UserProfile>('/api/users/profile/me', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Audit Logs
  audit: {
    list: (params?: {
      actor_id?: string
      entity_type?: string
      action?: string
      from_date?: string
      to_date?: string
      skip?: number
      limit?: number
    }) => request<{ total: number; items: AuditLogItem[] }>('/api/audit', { params }),
  },

  // Reports
  reports: {
    getCasePdf: (caseId: string) =>
      request<Blob>(`/api/reports/cases/${caseId}/pdf`),
  },
}
