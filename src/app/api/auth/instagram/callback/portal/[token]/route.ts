import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const origin = request.nextUrl.origin;
  const token = params.token;
  return NextResponse.redirect(`${origin}/portal/${token}`, 307);
}
