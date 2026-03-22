import { NextResponse } from 'next/server';
import { getAlertMessage } from '@/lib/alert-message';

/**
 * GET /api/alerts/message
 *
 * Returns the message to be spoken during an alert call, and a sentiment
 * classification used to select the appropriate voice.
 * Currently hardcoded — will use Gemini to generate both dynamically.
 *
 * Responses:
 *   200  { message: string, sentiment: "light" | "medium" | "heavy" }
 */
export async function GET() {
  // BIG BIG TODO: Replace with Gemini-generated message + sentiment based on financial data
  const result = await getAlertMessage();
  return NextResponse.json(result);
}
