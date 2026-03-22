import { NextResponse } from 'next/server';

/**
 * GET /api/alerts/message
 *
 * Returns the message to be spoken during an alert call.
 * Currently returns a static string — will eventually generate a dynamic
 * message based on the business's current financial state.
 *
 * Responses:
 *   200  { message: string }
 */
export async function GET() {
  // TODO: Implement dynamic message generation based on financial data nick nick nick
  const message =
    'Your business cash runway needs attention. ' +
    'Please log in to your Runway dashboard to review your latest financial alerts.';

  return NextResponse.json({ message });
}
