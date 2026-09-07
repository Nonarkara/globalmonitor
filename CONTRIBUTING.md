# Contributing

This is an independent digital-economy and geopolitical OSINT map — **not** a depa product. Forks, issues, and patches that keep sources visible are welcome.

## Run it

Requires **Node 20** and npm. No private endpoints are required.

```bash
git clone https://github.com/Nonarkara/globalmonitor.git
cd globalmonitor
npm install
npm run dev:stack
```

That starts Vite on `http://127.0.0.1:5180` and the cache API on `http://127.0.0.1:4000` (`/api` is proxied). Copy [`.env.example`](.env.example) to `.env.local` only if you have **your own** keys from those public providers. Leave it empty and the UI still renders public tiles, snapshots, and fallbacks.

Useful checks: `npm test`, `npm run lint`, `npm run build`.

## Pull requests

- Target `main`.
- Do not commit `.env.local`, tokens, service-account JSON, or provider keys.
- Do not add a government endorsement that does not exist.
- Keep measured observations labelled separately from modelled or compiled figures.
- Prefer a small, reviewable change over a rewrite.

The civic invitation is the **method** (open feeds, visible provenance). Third-party datasets keep their own licences — see [`src/data/dataSources.json`](src/data/dataSources.json).

Questions: [non@nonarkara.org](mailto:non@nonarkara.org). Security reports go to [SECURITY.md](SECURITY.md), not a public issue.
