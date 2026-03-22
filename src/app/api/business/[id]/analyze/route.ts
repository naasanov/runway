import {
  analyzeBusiness,
  analyzeErrorToResponse,
} from "@/lib/analyze-business";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const body = await analyzeBusiness(params.id);
    return NextResponse.json(body);
  } catch (error) {
    return analyzeErrorToResponse(error);
  }
}
