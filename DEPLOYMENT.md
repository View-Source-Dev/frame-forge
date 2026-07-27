# Frame Forge deployment

Frame Forge runs as two long-lived Node.js services:

1. **web** — the Next.js website and HTTP API.
2. **worker** — `@anthropic-ai/claude-agent-sdk`, the `img2threejs` skill,
   headless Chromium, and GLB export.

The services share one durable `data` volume. Uploading an image writes a queued
job to that volume; the worker claims it, runs Claude on the server, renders the
result, and writes the GLB back for the website to serve.

This design is intentionally not an in-request SDK call. Reconstruction takes
minutes, so starting it inside a route handler would be vulnerable to request
timeouts and server restarts.

## Requirements

- A Linux server or VM with Docker Engine 24+ and Docker Compose v2.
- At least 4 GB RAM; 8 GB is recommended for Chromium plus the agent.
- Persistent disk space for the `frame_forge_data` volume.
- Outbound HTTPS access to Anthropic and GitHub during image build.
- An Anthropic API key with sufficient usage limits.

This deployment targets a persistent server/container host. A stateless
serverless deployment is not sufficient because the worker is long-running and
the current job/artifact store uses a shared filesystem.

## Start

```bash
cp .env.production.example .env.production
```

Edit `.env.production`, then run:

```bash
docker compose --env-file .env.production up -d --build
```

Open `http://SERVER_IP:3000`, or the port set by `FRAME_FORGE_PORT`.

The API key is passed only to the worker container. It is never embedded in the
browser bundle and must never use a `NEXT_PUBLIC_` prefix.

## Verify

```bash
docker compose --env-file .env.production ps
curl --fail http://127.0.0.1:3000/api/health?strict=1
docker compose --env-file .env.production logs -f worker
```

`/api/health?strict=1` returns HTTP 503 until the Agent SDK worker heartbeat is
fresh. The upload endpoint also rejects new jobs while the production worker is
unavailable, avoiding permanently queued work.

## What the image contains

- The web image is Next.js standalone output.
- The worker image installs `@anthropic-ai/claude-agent-sdk`, its bundled Claude
  runtime, Chromium, Python 3, and a pinned `img2threejs` Git revision.
- `FORGE_USE_STUB=0` ensures uploaded images use the real Agent SDK path.
- Interrupted `running` jobs are re-queued when the single worker restarts.

To upgrade `img2threejs`, set `IMG2THREEJS_GIT_REF` to a reviewed commit SHA in
`.env.production`, then rebuild the worker image.

## Reverse proxy and TLS

Put nginx, Caddy, or your cloud load balancer in front of port 3000. Terminate
TLS there and allow request bodies larger than 12 MB so the application-level
image limit can operate correctly. Do not expose the worker container.

## Persistence and scaling

The named volume contains uploaded references, job state, generated workspaces,
GLBs, and share artifacts. Back it up like application data.

This filesystem queue supports one web host and one worker safely. Before
running multiple machines or multiple workers, replace it with:

- a transactional queue such as Redis/BullMQ, SQS, or a database-backed queue;
- PostgreSQL for job metadata;
- S3-compatible object storage for references and GLBs.

Do not scale the current worker service above one replica: the filesystem queue
does not yet implement distributed job leases.
