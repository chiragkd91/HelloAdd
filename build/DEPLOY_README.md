## Build Artifacts For Server Hosting

This folder contains production build outputs for both Next.js apps:

- `build/dashboard` (runs on port `3001`)
- `build/web` (runs on port `30002`)

Each app folder includes:

- `.next/`
- `public/`
- `package.json`
- `next.config.js`

## Server Setup

1. Copy the full repository (or at least app source + this build folder) to server.
2. Install dependencies from repo root:

```bash
npm ci
```

3. Start apps:

```bash
# Dashboard
cd apps/dashboard
npm run start

# Web (new terminal)
cd apps/web
npm run start
```

## Notes

- This project currently uses standard `next build` output, not `output: "standalone"`.
- Because of that, runtime uses workspace code + `node_modules` on server.
- If you want a smaller deploy package, we can switch both apps to standalone mode next.
