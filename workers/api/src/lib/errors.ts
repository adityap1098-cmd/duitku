/**
 * AppError — structured error class for the API.
 * All route/service errors should throw AppError, not plain Error.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

/**
 * Factory helpers for common error patterns.
 * Usage: throw Errors.NOT_FOUND('Transaction');
 */
export const Errors = {
  NOT_FOUND: (entity: string) =>
    new AppError('NOT_FOUND', `${entity} not found`, 404),

  UNAUTHORIZED: (reason = 'Authentication required') =>
    new AppError('UNAUTHORIZED', reason, 401),

  FORBIDDEN: (reason = 'Access denied') =>
    new AppError('FORBIDDEN', reason, 403),

  VALIDATION: (message: string, details?: Record<string, unknown>) =>
    new AppError('VALIDATION_ERROR', message, 400, details),

  PREMIUM_REQUIRED: (feature: string) =>
    new AppError('PREMIUM_REQUIRED', `${feature} requires premium tier`, 403),

  CONFLICT: (message: string) =>
    new AppError('CONFLICT', message, 409),

  RATE_LIMITED: (retryAfter?: number) =>
    new AppError('RATE_LIMITED', 'Too many requests', 429, retryAfter ? { retry_after: retryAfter } : undefined),

  INTERNAL: (message = 'Internal server error') =>
    new AppError('INTERNAL_ERROR', message, 500),
} as const;
