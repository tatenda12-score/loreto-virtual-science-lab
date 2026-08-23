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
 *  - Typed helper functions for common auth actions
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
})

// ── Request interceptor — attach JWT ──────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ── Response interceptor — handle 401 globally ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// ── Token helpers ──────────────────────────────────────────────────────────
export const saveToken  = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = ()              => localStorage.removeItem(TOKEN_KEY)
export const getToken   = ()              => localStorage.getItem(TOKEN_KEY)
export const isLoggedIn = ()              => Boolean(getToken())

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

export interface Experiment {
  id:           number
  title:        string
  subject:      'Physics' | 'Chemistry' | 'Biology'
  difficulty:   'Beginner' | 'Intermediate' | 'Advanced'
  description:  string
  instructions: Record<string, unknown>[] | null
  parameters:   Record<string, unknown> | null
  created_by:   number | null
  created_at:   string
  updated_at:   string
}

export interface Submission {
  id:                    number
  student_id:            number
  experiment_id:         number
  recorded_observations: Record<string, unknown> | null
  calculated_score:      number | null
  teacher_feedback:      string | null
  status:                'draft' | 'submitted' | 'graded'
  submitted_at:          string | null
  created_at:            string
  updated_at:            string
}

// ── Auth API calls ─────────────────────────────────────────────────────────
/**
 * Login with email + password (OAuth2 form).
 * Returns the JWT token string on success.
 */
export async function loginUser(email: string, password: string): Promise<string> {
  // FastAPI OAuth2PasswordRequestForm expects form-encoded data
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)

  const res = await api.post<TokenResponse>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data.access_token
}

export async function getMe(): Promise<UserProfile> {
  const res = await api.get<UserProfile>('/auth/me')
  return res.data
}

// ── Experiments API calls ──────────────────────────────────────────────────
export async function fetchExperiments(skip = 0, limit = 20): Promise<Experiment[]> {
  const res = await api.get<Experiment[]>('/experiments/', { params: { skip, limit } })
  return res.data
}

export async function fetchExperiment(id: number): Promise<Experiment> {
  const res = await api.get<Experiment>(`/experiments/${id}`)
  return res.data
}

// ── Submissions API calls ──────────────────────────────────────────────────
export async function fetchMySubmissions(): Promise<Submission[]> {
  const res = await api.get<Submission[]>('/submissions/me')
  return res.data
}

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

export async function fetchSubmissionsForExperiment(experimentId: number): Promise<Submission[]> {
  const res = await api.get<Submission[]>(`/submissions/experiment/${experimentId}`)
  return res.data
}

export async function gradeSubmission(
  submissionId: number,
  feedback: string,
  score?: number,
): Promise<Submission> {
  const res = await api.patch<Submission>(`/submissions/${submissionId}/grade`, {
    teacher_feedback: feedback,
    ...(score !== undefined && { calculated_score: score }),
  })
  return res.data
}

export default api
