import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors/AppError.js';

/** body-parser signals malformed, oversized or unsupported payloads through `type`, never as an AppError. */
function requestBodyError(err: Error): { message: string; statusCode: number } | null {
  const type = (err as Error & { type?: string }).type;
  if (type === 'entity.parse.failed') return { message: 'Request body must be valid JSON.', statusCode: 400 };
  if (type === 'entity.too.large') return { message: 'Request body is too large.', statusCode: 413 };
  if (type === 'encoding.unsupported') return { message: 'Request body encoding is not supported.', statusCode: 415 };
  if (type === 'entity.verify.failed') return { message: 'Request body must be valid JSON.', statusCode: 400 };
  return null;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      statusCode: err.statusCode
    });
    return;
  }

  const payloadError = requestBodyError(err);
  if (payloadError) {
    res.status(payloadError.statusCode).json({
      success: false,
      error: payloadError.message,
      statusCode: payloadError.statusCode
    });
    return;
  }

  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    statusCode: 500
  });
}

