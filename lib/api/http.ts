import { NextResponse } from 'next/server';

/** Standard error envelope (tech-spec §3): { error: message, code: MACHINE_CODE }. */
export function apiError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export const unauthorized = () =>
  apiError('UNAUTHORIZED', 'Authentication required', 401);

export const notFound = (message = 'Not found') =>
  apiError('NOT_FOUND', message, 404);

export const validationError = (
  message: string,
  fields?: Record<string, string>
) => apiError('VALIDATION_ERROR', message, 400, fields ? { fields } : undefined);

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}
