import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-static"

export async function GET() {
  const specPath = path.resolve(process.cwd(), "..", "..", "docs", "api", "openapi.json")
  const text = await readFile(specPath, "utf8")
  return new NextResponse(text, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  })
}
