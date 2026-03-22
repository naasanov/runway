import { NextResponse } from 'next/server';

// TODO: Implement dynamic message generation based on financial data nick nick nick
/** Generate the alert call message. Shared by the route and scheduled-call. */
export async function getAlertMessage(): Promise<string> {
  return (
    'Your business cash runway needs attention. ' +
    'Please log in to your Runway dashboard to review your latest financial alerts.'
  );
}

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
  const message = await getAlertMessage();
  return NextResponse.json({ message });
}
