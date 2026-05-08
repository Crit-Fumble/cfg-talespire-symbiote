# Crit-Fumble Core — TaleSpire symbiote

TaleSpire symbiote that connects a TaleSpire board to [Crit-Fumble Core](https://crit-fumble.com) — sync dice, chat, initiative, and more.

- **Symbiote name:** `CFG Core`
- **Manifest:** [manifest.json](manifest.json)

## Development

```bash
npm install
npm run dev   # serves on http://localhost:5173
```

The symbiote is a static bundle (`index.html` + `scripts/` + `icons/`); no build step required.

## Environment

There are no env vars to configure. The Core URL is hard-coded in
[`scripts/main.js`](scripts/main.js) as `CORE_URL` and can be overridden at
runtime via TaleSpire's per-campaign localStorage. See [`.env.example`](.env.example)
for the (deliberately empty) contract.

## License

AGPL-3.0-only. See [LICENSE](LICENSE) and [TRADEMARK.md](TRADEMARK.md).
