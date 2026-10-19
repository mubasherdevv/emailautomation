import { NextResponse } from "next/server";

export function errorResponse(message: string, status = 500, details?: unknown) {
  const body: { error: string; details?: unknown } = { error: message };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export function successResponse<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
