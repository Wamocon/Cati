import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import {
  getReportPayload,
  ReportingRepositoryError,
} from "@/lib/reporting-repository"

export const dynamic = "force-dynamic"

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function errorResponse(error: unknown) {
  if (error instanceof ReportingRepositoryError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus, headers: privateHeaders }
    )
  }
  console.error("Report download failed.", error)
  return NextResponse.json(
    {
      error: "The report artifact could not be downloaded.",
      code: "REPORTING_DOWNLOAD_UNAVAILABLE",
    },
    { status: 503, headers: privateHeaders }
  )
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ artifactId: string }> }
) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json(
      { error: "Authentication is required.", code: "AUTH_REQUIRED" },
      { status: 401, headers: privateHeaders }
    )
  }
  if (!hasPermission(profile.role, "reports", "export")) {
    return NextResponse.json(
      { error: "Your role cannot download report artifacts.", code: "REPORTING_FORBIDDEN" },
      { status: 403, headers: privateHeaders }
    )
  }

  const { artifactId } = await context.params
  if (!uuidPattern.test(artifactId)) {
    return NextResponse.json(
      { error: "A valid report artifact id is required.", code: "REPORTING_ARTIFACT_ID_INVALID" },
      { status: 422, headers: privateHeaders }
    )
  }

  try {
    const payload = await getReportPayload(profile, artifactId)
    const bytes = new TextEncoder().encode(payload.content)
    const checksum = createHash("sha256").update(bytes).digest("hex")
    if (
      checksum !== payload.artifact.sha256Hex ||
      bytes.byteLength !== payload.artifact.byteSize
    ) {
      throw new ReportingRepositoryError(
        "REPORTING_ARTIFACT_INTEGRITY_FAILED",
        "The stored report artifact failed checksum verification.",
        503
      )
    }

    const safeName =
      payload.artifact.fileName.replace(/[^A-Za-z0-9._-]/g, "_") || "report.csv"
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
    return new Response(stream, {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Type": payload.artifact.contentType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(payload.artifact.fileName)}`,
        Digest: `sha-256=${Buffer.from(checksum, "hex").toString("base64")}`,
        "X-Report-Row-Count": String(payload.artifact.rowCount),
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
