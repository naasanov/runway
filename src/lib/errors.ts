import { NextResponse } from "next/server";

export function errorResponse(
  error: string,
  code: string,
  status: number
) {
  return NextResponse.json({ error, code }, { status });
}

export function badRequest(error: string, code: string) {
  return errorResponse(error, code, 400);
}

export function notFound(error: string, code: string) {
  return errorResponse(error, code, 404);
}

export function serverError(error: string, code: string) {
  return errorResponse(error, code, 500);
}
