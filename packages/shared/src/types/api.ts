/**
 * Standard API response envelopes.
 * Every endpoint wraps its output in one of these shapes.
 */

/** Successful response with data */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Error response */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/** Paginated response with data array + pagination info */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

/** Union of all possible API return shapes */
export type ApiResult<T> = ApiResponse<T> | ApiError;
