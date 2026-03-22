import { NextRequest, NextResponse } from 'next/server';
import { loadDashboardData, DashboardDataError } from '@/lib/dashboard-data';
import { getAlertMessage } from '@/lib/alert-message';
import { badRequest, notFound, serverError } from '@/lib/errors';

/**
 * GET /api/alerts/message
 *
 * Returns the message to be spoken during an alert call for a business,
 * plus a sentiment classification used to select the appropriate voice.
 *
 * Responses:
 *   200  { message: string, sentiment: "light" | "medium" | "heavy" }
 *   400  { error, code: "MISSING_BUSINESS_ID" }
 */
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');

  if (!businessId) {
    return badRequest('businessId is required', 'MISSING_BUSINESS_ID');
  }

  try {
    const dashboardData = await loadDashboardData(businessId);
    const result = await getAlertMessage(dashboardData);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DashboardDataError && error.code === 'BUSINESS_NOT_FOUND') {
      return notFound(error.message, error.code);
    }

    return serverError('Failed to build alert message', 'ALERT_MESSAGE_FAILED');
  }
}
