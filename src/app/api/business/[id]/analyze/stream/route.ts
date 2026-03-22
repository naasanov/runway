import {
  analyzeBusiness,
  AnalyzePipelineError,
} from "@/lib/analyze-business";
import type { AnalyzeFailedEvent, AnalyzeStreamEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

function serializeSseEvent(event: AnalyzeStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AnalyzeStreamEvent) => {
        controller.enqueue(encoder.encode(serializeSseEvent(event)));
      };

      const sendHeartbeat = () => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      };

      heartbeat = setInterval(sendHeartbeat, 15000);

      const closeStream = () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        controller.close();
      };

      req.signal.addEventListener("abort", () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
      });

      void (async () => {
        try {
          await analyzeBusiness(params.id, {
            onProgress: async (event) => {
              send(event);
            },
          });
        } catch (error) {
          const failedEvent: AnalyzeFailedEvent = {
            type: "analysis_failed",
            code:
              error instanceof AnalyzePipelineError
                ? error.code
                : "ANALYZE_FAILED",
            message:
              error instanceof AnalyzePipelineError
                ? error.message
                : "Analysis failed. Please try again.",
          };
          send(failedEvent);
        } finally {
          closeStream();
        }
      })();
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
