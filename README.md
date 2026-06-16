# nomenclate-proxy
Serverless proxy that connects the Nomenclate Figma plugin to Anthropic's Claude API for naming convention analysis.

## Project description

The proxy receives a list of Figma component names and a chosen naming convention from the Nomenclate plugin, sends them to Claude for analysis, and returns rename suggestions with conformance status and justifications. It runs as Vercel Serverless Functions (Node.js + TypeScript).

## Local development

**Prerequisites:** Node.js 18+, a Vercel account (for `vercel dev`), an Anthropic API key.

```bash
# Install dependencies
npm install

# Copy the env template and fill in your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# Start the local dev server (requires Vercel CLI)
npm run dev
# Endpoints available at http://localhost:3000/api/health and /api/analyze

# Type-check without emitting
npm run typecheck
```

If you don't have the Vercel CLI, install it globally first:

```bash
npm install -g vercel
```

## Deployment (Vercel)

```bash
# One-time: link this directory to a Vercel project
vercel link

# Set the API key as a Vercel secret
vercel env add ANTHROPIC_API_KEY

# Deploy to production
vercel --prod
```

All functions in `api/` are auto-deployed. The `vercel.json` sets a 30-second timeout per function.

## API contract

### `GET /api/health`

Returns `200 OK` when the service is running.

**Response**
```json
{ "status": "ok" }
```

---

### `POST /api/analyze`

Analyzes a list of Figma component names against a naming convention and returns conformance results.

**Request headers**
```
Content-Type: application/json
```

**Request body**
```ts
{
  components: Array<{
    id: string;           // Figma node ID
    name: string;         // Current component name
    type: "COMPONENT" | "COMPONENT_SET";
  }>;
  convention: "tailwind" | "material3" | "atlassian" | "polaris" | "atomic";
}
```

Constraints:
- Maximum **50 components** per request (returns `400` if exceeded).
- Maximum **5 requests per IP per hour** (returns `429` if exceeded).

**Response `200`**
```ts
Array<{
  id: string;
  currentName: string;
  status: "conform" | "non_conform" | "ambiguous";
  suggestedName: string | null;  // null when status is "conform"
  justification: string;
}>
```

**Error responses**

| Status | Meaning |
|--------|---------|
| `400`  | Invalid request body (missing fields, wrong types, too many components, unknown convention) |
| `405`  | Method not allowed (only POST is accepted) |
| `429`  | Rate limit exceeded |
| `502`  | Claude API error or malformed response |

All responses include `Access-Control-Allow-Origin: *` for Figma plugin access.
