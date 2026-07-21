# Crit-Fumble Core — TaleSpire symbiote

TaleSpire symbiote that connects a TaleSpire board to [Crit-Fumble Core](https://crit-fumble.com) — sync dice, chat, initiative, and more.

- **Symbiote name:** `CFG Core`
- **Manifest:** [manifest.json](manifest.json) (production) · [manifest.dev.json](manifest.dev.json) (local)
- **API:** [Symbiote API 0.1](https://symbiote-docs.talespire.com/api_doc_v0_1.md.html)

## How it works

This repo ships **no application code** — only a manifest and icons. `entryPoint` is a
remote URL, so TaleSpire loads `https://core.crit-fumble.com/talespire/` (served by
`cfg-core-browser`) directly in its embedded Chromium and **injects the `TS` API into
that page**. There is no iframe and no postMessage bridge; the UI calls `TS.*` natively.

The browser side of the contract lives in `cfg-core-browser`:

- `src/clients/browser/talespire-api.ts` — typed facade over the injected `window.TS`
- `src/views/talespire/*` — the symbiote UI (sign-in, campaign picker, linked view)

### Subscriptions are manifest-declared

TaleSpire does **not** offer runtime event subscription. `api.subscriptions` maps an
event source to the name of a **global function** the loaded page must define. Those
globals are installed by `installTalespireEventBridge()` in `talespire-api.ts`, and the
names must match this manifest exactly:

| Manifest subscription | Global function |
| --- | --- |
| `symbiote.onStateChangeEvent` | `cfgTsStateChange` |
| `urls.onUrlMessage` | `cfgTsUrlMessage` |
| `chat.onChatMessage` | `cfgTsChatMessage` |
| `dice.onRollResults` | `cfgTsRollResults` |
| `initiative.onInitiativeEvent` | `cfgTsInitiative` |
| `creatures.onCreatureStateChange` | `cfgTsCreatureState` |
| `clients.onClientEvent` | `cfgTsClientEvent` |

Callbacks receive `{ kind, payload }`. Adding an event means editing **both** files.

## Development

```bash
npm install
npm run link:dev   # install into TaleSpire pointing at the local dev tunnel
npm run link       # install into TaleSpire pointing at production
npm run unlink     # remove it again
```

`link` symlinks this repo's files into TaleSpire's local `Symbiotes` directory, so edits
here need only a symbiote reload — no build, no copy. Because `entryPoint` is remote,
UI changes need no relink at all: just reload the symbiote.

### Why dev points at a tunnel, not localhost

`link:dev` targets `https://cfg-localdev.crit-fumble-web.workers.dev` — the stable
Cloudflare Worker that fronts the local dev stack — **not** `localhost:10000`. Auth needs
an HTTPS origin that Discord (and Steam OpenID) will redirect back to, and Caddy on
localhost is not one. The Worker URL is stable across tunnel restarts even though the
underlying `*.trycloudflare.com` URL rotates.

Bring the stack up with `npm run dev` from `cfg-core-dev-tools` (tunnel + docker). Running
`docker compose` directly gives you Caddy on :10000 but **no tunnel**, so you cannot log in
— and the dev database starts with zero users. The workspace's own `next dev` does not boot
at all (no `.env`).

## Environment

There are no env vars. The Core URL is the `entryPoint` in the manifest — pick dev or
production by which manifest you link. See [`.env.example`](.env.example) for the
(deliberately empty) contract.

## License

AGPL-3.0-only. See [LICENSE](LICENSE) and [TRADEMARK.md](TRADEMARK.md).
