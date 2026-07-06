import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const specPath = path.join(rootDir, "docs", "api", "openapi.json")
const apiRoot = path.join(rootDir, "apps", "web", "app", "api")
const outDir = path.join(rootDir, "quality", "results", "openapi-contract")

async function walkRoutes(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walkRoutes(absolutePath)))
    if (entry.isFile() && entry.name === "route.ts") files.push(absolutePath)
  }
  return files
}

function routePathFromFile(filePath) {
  const relative = path.relative(apiRoot, filePath).replace(/\\/g, "/")
  const route = relative.replace(/\/route\.ts$/, "")
  return `/api/${route}`
}

function methodsFromRouteSource(source) {
  const methods = []
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)) {
    methods.push(match[1].toLowerCase())
  }
  return methods
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message)
}

const failures = []
const spec = JSON.parse(await fs.readFile(specPath, "utf8"))

assert(spec.openapi === "3.2.0", "OpenAPI version must be 3.2.0.", failures)
assert(Boolean(spec.info?.title), "info.title is required.", failures)
assert(Boolean(spec.info?.version), "info.version is required.", failures)
assert(Boolean(spec.paths && typeof spec.paths === "object"), "paths object is required.", failures)
assert(Boolean(spec.components?.schemas?.ErrorResponse), "ErrorResponse schema is required.", failures)
assert(Boolean(spec.components?.securitySchemes?.AccessProfileCookie), "AccessProfileCookie security scheme is required.", failures)

const routeFiles = await walkRoutes(apiRoot)
const routeChecks = []

for (const filePath of routeFiles) {
  const apiPath = routePathFromFile(filePath)
  const source = await fs.readFile(filePath, "utf8")
  const methods = methodsFromRouteSource(source)
  const documentedPath = spec.paths[apiPath]
  const methodChecks = methods.map((method) => {
    const documented = Boolean(documentedPath?.[method])
    if (!documented) failures.push(`${method.toUpperCase()} ${apiPath} is missing from docs/api/openapi.json.`)
    return { method: method.toUpperCase(), documented }
  })
  routeChecks.push({
    path: apiPath,
    methods: methodChecks,
    documented: Boolean(documentedPath),
  })
}

for (const [apiPath, pathItem] of Object.entries(spec.paths)) {
  const methodNames = Object.keys(pathItem).filter((key) => ["get", "post", "put", "patch", "delete"].includes(key))
  assert(methodNames.length > 0, `${apiPath} must document at least one HTTP method.`, failures)
  for (const method of methodNames) {
    const operation = pathItem[method]
    assert(Boolean(operation.operationId), `${method.toUpperCase()} ${apiPath} must define operationId.`, failures)
    assert(Boolean(operation.summary), `${method.toUpperCase()} ${apiPath} must define summary.`, failures)
    assert(Boolean(operation.description), `${method.toUpperCase()} ${apiPath} must define description.`, failures)
    assert(
      Object.keys(operation.responses ?? {}).some((statusCode) => /^2\d\d$/.test(statusCode)),
      `${method.toUpperCase()} ${apiPath} must define success response.`,
      failures
    )
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  spec: path.relative(rootDir, specPath).replace(/\\/g, "/"),
  openapi: spec.openapi,
  pathCount: Object.keys(spec.paths).length,
  routeCount: routeChecks.length,
  routeChecks,
  passed: failures.length === 0,
  failures,
}

await fs.mkdir(outDir, { recursive: true })
await fs.writeFile(path.join(outDir, "openapi-contract-report.json"), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))

if (!result.passed) process.exit(1)
