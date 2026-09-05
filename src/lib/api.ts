const API_BASE = '/api';

export function setAuthToken(token: string | null) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('oi_token', token);
    } else {
      localStorage.removeItem('oi_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('oi_token');
  }
  return null;
}

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { params, headers, ...fetchOptions } = options;
  
  const token = getAuthToken();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrlStr = `${origin}${API_BASE}${formattedPath}`;
  const url = new URL(fullUrlStr);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers: requestHeaders,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error?.message || `HTTP ${response.status}`);
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data as T;
  } catch (err: any) {
    console.warn(`[API] fetch warning for ${path}:`, err.message);
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, params?: ApiOptions['params']) => apiFetch<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body: any) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: any) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: any) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export default apiClient;
