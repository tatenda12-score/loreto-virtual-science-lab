/**
 * src/services/api.ts
 * -------------------
 * Configured Axios instance for the Virtual Science Lab API.
 *
 * Features
 * --------
 *  - Base URL points to FastAPI backend at /api/v1
 *  - Request interceptor automatically attaches JWT from localStorage
 *  - Response interceptor redirects to /login on 401 (token expired / missing)
 *  - Typed helper functions for all API operations
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// ── Constants ──────────────────────────────────────────────────────────────
export const TOKEN_KEY = 'vsl_access_token'
export const API_BASE  = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1'

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
  withCredentials: true, // Send HttpOnly cookies with every request
})

// ── Request interceptor ───────────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ── Response interceptor — handle 401 globally ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear state and redirect to login
      localStorage.removeItem('is_logged_in')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// ── Token helpers ──────────────────────────────────────────────────────────
export const setLoginState  = (state: boolean) => {
  if (state) localStorage.setItem('is_logged_in', 'true');
  else localStorage.removeItem('is_logged_in');
}
export const isLoggedIn = () => Boolean(localStorage.getItem('is_logged_in'))

// ── API helper types ───────────────────────────────────────────────────────
export interface LoginPayload  { username: string; password: string }
export interface TokenResponse { access_token: string; token_type: string }

export interface UserProfile {
  id:            number
  full_name:     string
  email:         string
  role:          'admin' | 'teacher' | 'student'
  class_level:   string | null
  subject_code:  string | null
  gender:        string | null
  is_active:     boolean
  is_verified:   boolean
  created_at:    string
  updated_at:    string
}

export interface RegisterPayload {
  full_name:    string
  email:        string
  password:     string
  class_level?: string
  gender?:      string
}

export interface TeacherCreatePayload {
  full_name:    string
  email:        string
  password:     string
  subject_code?: string
  gender?:      string
}

export interface AdminUserUpdatePayload {
  full_name?:    string
  email?:        string
  subject_code?: string
  class_level?:  string
  gender?:       string
  is_active?:    boolean
}

export interface AdminStats {
  total_students:        number
  total_teachers:        number
  total_admins:          number
  total_experiments:     number
  published_experiments: number
  draft_experiments:     number
  archived_experiments:  number
  total_submissions:     number
  graded_submissions:    number
  pending_submissions:   number
}

export interface ExperimentCreatePayload {
  title:            string
  description:      string
  subject:          'Physics' | 'Chemistry' | 'Biology'
  difficulty?:      'Beginner' | 'Intermediate' | 'Advanced'
  simulation_type?: 'ohms_law' | 'titration' | 'velocity' | 'ph' | 'microscopy' | 'generic'
  status?:          'draft' | 'published' | 'archived'
  topic?:           string
  materials?:       string[] | Record<string, unknown>
  instructions?:    Record<string, unknown>[]
  parameters?:      Record<string, unknown>
}

export interface Experiment {
  id:              number
  title:           string
  subject:         'Physics' | 'Chemistry' | 'Biology'
  difficulty:      'Beginner' | 'Intermediate' | 'Advanced'
  simulation_type: 'ohms_law' | 'titration' | 'velocity' | 'ph' | 'microscopy' | 'generic'
  status:          'draft' | 'published' | 'archived'
  topic:           string | null
  description:     string
  materials:       string[] | Record<string, unknown> | null
  instructions:    Record<string, unknown>[] | null
  parameters:      Record<string, unknown> | null
  created_by:      number | null
  created_at:      string
  updated_at:      string
}

export interface Submission {
  id:                    number
  student_id:            number
  experiment_id:         number
  recorded_observations: Record<string, unknown> | null
  automatic_score:       number | null
  final_score:           number | null
  graded_by_id:          number | null
  graded_at:             string | null
  teacher_feedback:      string | null
  status:                'draft' | 'submitted' | 'graded'
  submitted_at:          string | null
  created_at:            string
  updated_at:            string
}

export interface AuditLog {
  id:               number
  user_id:          number | null
  action:           string
  entity_type:      string | null
  entity_id:        string | null
  metadata_payload: Record<string, unknown> | null
  created_at:       string
}

// ── Auth API calls ─────────────────────────────────────────────────────────
/**
 * Login with email + password (OAuth2 form).
 * Returns the JWT token string on success.
 */
export async function loginUser(email: string, password: string): Promise<void> {
  // FastAPI OAuth2PasswordRequestForm expects form-encoded data
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)

  await api.post<TokenResponse>('/auth/login/cookie', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout')
}

/** Register a new student account. */
export async function registerStudent(data: RegisterPayload): Promise<UserProfile> {
  const res = await api.post<UserProfile>('/auth/register', data)
  return res.data
}

/** Fetch the current authenticated user profile. */
export async function getMe(): Promise<UserProfile> {
  const res = await api.get<UserProfile>('/auth/me')
  return res.data
}

// ── Admin API calls ────────────────────────────────────────────────────────

/** Admin dashboard summary statistics. */
export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await api.get<AdminStats>('/admin/stats')
  return res.data
}

/** List users with optional role filter. */
export async function fetchUsers(params?: { role?: string; skip?: number; limit?: number }): Promise<UserProfile[]> {
  const res = await api.get<UserProfile[]>('/admin/users', { params })
  return res.data
}

/** Get a single user by ID. */
export async function fetchUser(id: number): Promise<UserProfile> {
  const res = await api.get<UserProfile>(`/admin/users/${id}`)
  return res.data
}

/** Create a teacher account (admin only). */
export async function createTeacher(data: TeacherCreatePayload): Promise<UserProfile> {
  const res = await api.post<UserProfile>('/admin/users/teacher', data)
  return res.data
}

/** Update user profile fields (admin only). */
export async function updateUser(id: number, data: AdminUserUpdatePayload): Promise<UserProfile> {
  const res = await api.patch<UserProfile>(`/admin/users/${id}`, data)
  return res.data
}

// ── Experiments API calls ──────────────────────────────────────────────────

// ── Experiments API ────────────────────────────────────────────────────────

export async function fetchExperiment(id: number): Promise<Experiment> {
  const res = await api.get<Experiment>(`/experiments/${id}`)
  return res.data
}

export async function fetchExperiments(statusFilter?: string): Promise<Experiment[]> {
  const params = statusFilter ? { status: statusFilter } : undefined
  const res = await api.get<Experiment[]>('/experiments/', { params })
  return res.data
}

export async function createExperiment(data: ExperimentCreatePayload): Promise<Experiment> {
  const res = await api.post<Experiment>('/experiments/', data)
  return res.data
}

export async function updateExperiment(id: number, data: Partial<ExperimentCreatePayload>): Promise<Experiment> {
  const res = await api.patch<Experiment>(`/experiments/${id}`, data)
  return res.data
}

export async function deleteExperiment(id: number): Promise<void> {
  await api.delete(`/experiments/${id}`)
}

export async function publishExperiment(id: number): Promise<Experiment> {
  const res = await api.post<Experiment>(`/experiments/${id}/publish`)
  return res.data
}

export async function archiveExperiment(id: number): Promise<Experiment> {
  const res = await api.post<Experiment>(`/experiments/${id}/archive`)
  return res.data
}

export async function duplicateExperiment(id: number): Promise<Experiment> {
  const res = await api.post<Experiment>(`/experiments/${id}/duplicate`)
  return res.data
}

// ── Submissions API calls ──────────────────────────────────────────────────

/** Fetch the current student's submissions. */
export async function fetchMySubmissions(): Promise<Submission[]> {
  const res = await api.get<Submission[]>('/submissions/me')
  return res.data
}

/** Submit observations for an experiment. */
export async function createSubmission(
  experimentId: number,
  observations: Record<string, unknown>,
): Promise<Submission> {
  const res = await api.post<Submission>('/submissions/', {
    experiment_id: experimentId,
    recorded_observations: observations,
  })
  return res.data
}

/** Fetch submissions for a specific experiment (teacher/admin). */
export async function fetchSubmissionsForExperiment(experimentId: number): Promise<Submission[]> {
  const res = await api.get<Submission[]>(`/submissions/experiment/${experimentId}`)
  return res.data
}

/** Grade a submission (teacher/admin). */
export async function gradeSubmission(
  id: number,
  feedback?: string,
  score?: number
): Promise<Submission> {
  const res = await api.patch<Submission>(`/submissions/${id}/grade`, {
    ...(feedback !== undefined && { teacher_feedback: feedback }),
    ...(score !== undefined && { final_score: score }),
  })
  return res.data
}

// ── Admin Logs ────────────────────────────────────────────────────────────

export async function fetchAuditLogs(skip = 0, limit = 50): Promise<AuditLog[]> {
  const res = await api.get<AuditLog[]>('/admin/audit-logs', {
    params: { skip, limit }
  })
  return res.data
}

export default api
