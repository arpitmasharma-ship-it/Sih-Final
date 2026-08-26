# Deployment

## Quick start (local)

```bash
npm run setup     # installs server + client deps, copies .env examples
npm run seed      # syncs 14 LMPC rules + demo users/products
npm run dev       # API :5000  ·  UI :5173
```

Demo logins: `admin@lmcc.gov.in / Admin@1234`,
`inspector@lmcc.gov.in / Insp@1234`, `analyst@lmcc.gov.in / Anal@1234`.

## Environment

### server/.env

| Key | Required | Notes |
|---|---|---|
| PORT | no | default 5000 |
| NODE_ENV | yes | `production` disables stack traces |
| MONGODB_URI | yes | Atlas or local |
| JWT_SECRET | yes | generate: `openssl rand -hex 48` |
| JWT_EXPIRES_IN | no | default `8h` |
| CLIENT_URL | yes | CORS origin of the SPA |
| COOKIE_SAMESITE | prod | `none` when client is a different origin |
| COOKIE_SECURE | prod | `true` behind HTTPS |
| CLOUDINARY_* | optional | omit → local disk storage under `server/uploads` |
| OCR_PROVIDER | no | `tesseract` (default) \| `demo` \| `remote` |
| REMOTE_OCR_URL | if remote | e.g. Render URL of ocr-service |

### client/.env

```
VITE_SERVER_URL=https://your-api.example.com
```

## Option A — Render (backend) + Vercel (frontend)

1. **MongoDB**: create a free Atlas cluster; allow network access.
2. **Backend**: import repo with `render.yaml` (root). Set
   `MONGODB_URI`, `CLIENT_URL`; the blueprint generates `JWT_SECRET`.
   Run `node seeds/seed.js` once from the Render shell to seed rules/users.
3. **Frontend**: Vercel project rooted at `client/`. Build `npm run build`,
   output `dist/` (config in `client/vercel.json`). Set `VITE_SERVER_URL`.
4. **OCR service** (optional): included in `render.yaml`
   (Python runtime, health check `/health`). Point `REMOTE_OCR_URL` at it.

> Local-disk uploads are ephemeral on free dynos — configure Cloudinary for any
> real deployment so scans and PDF reports survive redeploys.

## Option B — Single VM (Docker-compose style)

```bash
# node 20+, mongodb 7+
cd server && npm ci --omit=dev && NODE_ENV=production node server.js &
cd client && npm ci && npm run build && npx serve dist -l 5173
```

Terminate TLS with nginx/caddy; proxy `/api` and `/uploads` to :5000 and serve
the built SPA.

## Production checklist

- [ ] `NODE_ENV=production`, strong `JWT_SECRET`, `COOKIE_SECURE=true`
- [ ] CORS `CLIENT_URL` pinned to the exact SPA origin
- [ ] MongoDB auth enabled + backups
- [ ] Cloudinary (or S3) configured; `server/uploads` otherwise ephemeral
- [ ] Seed executed once (`node seeds/seed.js`) to install the rulebook
- [ ] Rate limiters reviewed for expected load
- [ ] HTTPS everywhere (cookies are SameSite=None in cross-origin prod)
