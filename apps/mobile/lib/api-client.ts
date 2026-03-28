/**
 * API client — authenticated fetch wrapper with auto-refresh on 401.
 * Queues concurrent requests during token refresh to avoid race conditions.
 */

import type { ApiResponse, ApiError } from '@duitku/shared';
import { Config } from '../constants/config';
import * as auth from './auth';

// --------------- Types ---------------

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header (for public endpoints) */
  noAuth?: boolean;
}

// --------------- Refresh Queue ---------------

/**
 * When a 401 is received, we queue all pending requests and refresh once.
 * After refresh, all queued requests are retried with the new token.
 */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function onTokenRefreshed(token: string | null): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void): void {
  refreshSubscribers.push(callback);
}

// --------------- Core Fetch ---------------

/**
 * Execute a fetch request with auth headers.
 * On 401, automatically refresh the token and retry once.
 */
async function authenticatedFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, noAuth = false } = options;

  // Build request headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth header if required
  if (!noAuth) {
    const token = await auth.getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${Config.API_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — attempt token refresh
  if (response.status === 401 && !noAuth) {
    return handleUnauthorized<T>(path, options);
  }

  // Parse response
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as ApiError | null;
    throw new ApiClientError(
      errorBody?.error?.code || 'API_ERROR',
      errorBody?.error?.message || `Request failed: ${response.status}`,
      response.status
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Handle 401 response: refresh token and retry the original request.
 * Uses a queue to prevent multiple concurrent refresh calls.
 */
async function handleUnauthorized<T>(
  path: string,
  options: RequestOptions
): Promise<T> {
  if (isRefreshing) {
    // Another refresh is in progress — wait for it to complete
    return new Promise<T>((resolve, reject) => {
      addRefreshSubscriber(async (newToken) => {
        if (!newToken) {
          reject(new ApiClientError('AUTH_EXPIRED', 'Session expired. Please login again.', 401));
          return;
        }
        try {
          // Retry with the new token
          const result = await authenticatedFetch<T>(path, { ...options, noAuth: false });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  isRefreshing = true;

  try {
    const tokens = await auth.refreshAccessToken();
    isRefreshing = false;

    if (!tokens) {
      onTokenRefreshed(null);
      throw new ApiClientError('AUTH_EXPIRED', 'Session expired. Please login again.', 401);
    }

    onTokenRefreshed(tokens.access_token);

    // Retry the original request with new token
    return authenticatedFetch<T>(path, options);
  } catch (error) {
    isRefreshing = false;
    onTokenRefreshed(null);
    throw error;
  }
}

// --------------- Public API ---------------

/**
 * GET request with authentication.
 */
export async function get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return authenticatedFetch<T>(path, { ...options, method: 'GET' });
}

/**
 * POST request with authentication.
 */
export async function post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return authenticatedFetch<T>(path, { ...options, method: 'POST', body });
}

/**
 * PUT request with authentication.
 */
export async function put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return authenticatedFetch<T>(path, { ...options, method: 'PUT', body });
}

/**
 * PATCH request with authentication.
 */
export async function patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return authenticatedFetch<T>(path, { ...options, method: 'PATCH', body });
}

/**
 * DELETE request with authentication.
 */
export async function del<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return authenticatedFetch<T>(path, { ...options, method: 'DELETE' });
}

// --------------- Error Class ---------------

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

// Default export as namespace for convenience
const apiClient = { get, post, put, patch, del };
export default apiClient;
