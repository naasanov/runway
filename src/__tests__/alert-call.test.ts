/**
 * Tests for POST /api/alerts/call
 *
 * alertCall (from @/scripts/alert-call) is mocked so tests run without
 * real ElevenLabs, Twilio, or filesystem access.
 */

jest.mock('@/scripts/alert-call', () => ({
  alertCall: jest.fn(),
}));

import { alertCall } from '@/scripts/alert-call';
import { POST } from '@/app/api/alerts/call/route';

const mockAlertCall = alertCall as jest.Mock;

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/alerts/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/alerts/call', () => {
  it('returns 400 MISSING_MESSAGE when body is empty', async () => {
    const req = new Request('http://localhost/api/alerts/call', {
      method: 'POST',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_MESSAGE');
  });

  it('returns 400 MISSING_MESSAGE when message field is absent', async () => {
    const req = makeRequest({ toNumber: '+15550001234' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MISSING_MESSAGE');
  });

  it('returns 200 { success: true } and calls alertCall with message', async () => {
    mockAlertCall.mockResolvedValueOnce(undefined);
    const req = makeRequest({ message: 'Cash runway is critically low' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockAlertCall).toHaveBeenCalledWith('Cash runway is critically low', undefined, undefined);
  });

  it('forwards optional toNumber and voiceId to alertCall', async () => {
    mockAlertCall.mockResolvedValueOnce(undefined);
    const req = makeRequest({ message: 'Test alert', toNumber: '+15550009999', voiceId: 'voice-123' });
    await POST(req as never);
    expect(mockAlertCall).toHaveBeenCalledWith('Test alert', '+15550009999', 'voice-123');
  });

  it('returns 500 CALL_FAILED when alertCall throws', async () => {
    mockAlertCall.mockRejectedValueOnce(new Error('Twilio error'));
    const req = makeRequest({ message: 'Test alert' });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('CALL_FAILED');
  });
});
