const mockCreate = jest.fn();
const mockUpload = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockRemove = jest.fn();
const mockFrom = jest.fn(() => ({
  upload: mockUpload,
  createSignedUrl: mockCreateSignedUrl,
  remove: mockRemove,
}));
const mockTwilio = jest.fn(() => ({
  calls: {
    create: mockCreate,
  },
}));

jest.mock("twilio", () => ({
  __esModule: true,
  default: mockTwilio,
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: mockFrom,
    },
  },
}));

jest.mock("@/lib/env", () => ({
  env: {
    ALERT_PHONE_NUMBER: "+15550000000",
    ELEVENLABS_API_KEY: "eleven-key",
    ELEVENLABS_VOICE_ID: "voice-default",
    SUPABASE_ALERT_AUDIO_BUCKET: "alert-audio",
    TWILIO_ACCOUNT_SID: "twilio-sid",
    TWILIO_AUTH_TOKEN: "twilio-token",
    TWILIO_FROM_NUMBER: "+15551112222",
  },
}));

import { alertCall } from "@/scripts/alert-call";

describe("alertCall", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }) as jest.Mock;

    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://supabase.example/audio.mp3?token=abc" },
      error: null,
    });
    mockCreate.mockResolvedValue({ sid: "CA123", status: "queued" });
    mockRemove.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it("uploads synthesized audio to Supabase and places the call with a signed URL", async () => {
    await alertCall("Cash runway is low", "+15559990000", "voice-heavy");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/text-to-speech/voice-heavy",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "xi-api-key": "eleven-key",
        }),
      }),
    );

    expect(mockFrom).toHaveBeenCalledWith("alert-audio");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^calls\/alert-\d+-.*\.mp3$/),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "audio/mpeg",
        upsert: false,
      }),
    );
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^calls\/alert-\d+-.*\.mp3$/),
      900,
    );

    expect(mockTwilio).toHaveBeenCalledWith("twilio-sid", "twilio-token");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15559990000",
        from: "+15551112222",
        machineDetection: "DetectMessageEnd",
        twiml: expect.stringContaining(
          "https://supabase.example/audio.mp3?token=abc",
        ),
      }),
    );
  });

  it("uses the default alert phone number and schedules uploaded audio cleanup", async () => {
    await alertCall("Test message");

    await jest.advanceTimersByTimeAsync(120_000);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15550000000",
      }),
    );
    expect(mockRemove).toHaveBeenCalledWith([
      expect.stringMatching(/^calls\/alert-\d+-.*\.mp3$/),
    ]);
  });

  it("throws when the Supabase upload fails", async () => {
    mockUpload.mockResolvedValueOnce({
      error: { message: "bucket missing" },
    });

    await expect(alertCall("Test message")).rejects.toThrow(
      "Supabase upload failed: bucket missing",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
