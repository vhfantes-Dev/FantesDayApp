import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AuthResponse, ProblemDetail } from './types';

// API publicada no Render (padrão).
const PRODUCTION_API_URL = 'https://fantesday-api.onrender.com';

// Endereço da API: EXPO_PUBLIC_API_URL, se definido; senão a API do Render.
// Para usar a API local, defina EXPO_PUBLIC_API_URL=local (usa o IP da máquina que roda o Metro, porta 8080).
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (!fromEnv) return PRODUCTION_API_URL;
  if (fromEnv !== 'local') return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8080`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetail;

  constructor(status: number, message: string, problem?: ProblemDetail) {
    super(message);
    this.status = status;
    this.problem = problem;
  }
}

// O AuthProvider registra aqui como ler o token, renovar a sessão e sair.
interface SessionHooks {
  getToken: () => string | null;
  refresh: () => Promise<AuthResponse | null>;
  onSessionExpired: () => void;
}

let hooks: SessionHooks = {
  getToken: () => null,
  refresh: async () => null,
  onSessionExpired: () => {},
};

export function configureSession(next: SessionHooks) {
  hooks = next;
}

// Várias requisições com 401 ao mesmo tempo compartilham uma única renovação.
let refreshing: Promise<AuthResponse | null> | null = null;

function refreshOnce() {
  if (!refreshing) {
    refreshing = hooks.refresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  auth?: boolean;
  form?: FormData;
}

function buildUrl(path: string, query?: Query) {
  const url = `${API_URL}/api${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return params ? `${url}?${params}` : url;
}

async function send(path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
}

async function parseError(res: Response): Promise<ApiError> {
  let problem: ProblemDetail | undefined;
  try {
    problem = (await res.json()) as ProblemDetail;
  } catch {
    problem = undefined;
  }
  const fallback =
    res.status === 401
      ? 'Sessão expirada. Entre novamente.'
      : res.status === 403
        ? 'Você não tem acesso a este item.'
        : res.status === 404
          ? 'Não encontrado.'
          : 'Algo deu errado. Tente de novo.';
  return new ApiError(res.status, problem?.detail || fallback, problem);
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  let res: Response;
  try {
    res = await send(path, opts, useAuth ? hooks.getToken() : null);
    if (res.status === 401 && useAuth) {
      const renewed = await refreshOnce();
      if (!renewed) {
        hooks.onSessionExpired();
        throw await parseError(res);
      }
      res = await send(path, opts, renewed.token);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, `Sem conexão com a API (${API_URL}).`);
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>(path, { method: 'POST', body: body ?? {}, query }),
  patch: <T>(path: string, body?: unknown, query?: Query) => request<T>(path, { method: 'PATCH', body, query }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'PUT', form }),
  publicPost: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body, auth: false }),
};

// URL absoluta para caminhos relativos devolvidos pela API (ex: photoUrl).
export function absoluteUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

export function authHeader() {
  const token = hooks.getToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}
