import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { resolveServiceProofFile } from "@/lib/service-proof-repository"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ proofId: string }> }
) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { proofId } = await params
  const reference = await resolveServiceProofFile({
    profile,
    evidenceId: proofId,
  })
  if (!reference) {
    return NextResponse.json(
      {
        error:
          "This evidence file is unavailable or has not passed private storage and scan checks.",
      },
      {
        status: 404,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    )
  }

  return NextResponse.redirect(reference.url, {
    status: 303,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  })
}
