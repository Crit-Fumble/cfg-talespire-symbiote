# Contributing to @crit-fumble/talespire-symbiote

Thanks for your interest in contributing. This is the TaleSpire symbiote that
connects a TaleSpire board to the Crit-Fumble platform — syncing dice, chat,
initiative, and more.

## Local dev setup

You need:

- **Node.js** (any recent LTS — only needed for the dev server)
- **TaleSpire** if you want to test the symbiote against a live board

```bash
# Clone, then:
npm install
npm run dev   # serves on http://localhost:5173
```

The symbiote is a **static bundle**: `index.html` + `scripts/` + `icons/` +
`manifest.json`. There is no build step. `npm run dev` just runs `serve` to
host the directory locally so TaleSpire can load it as a sideloaded symbiote.

To point TaleSpire at your local copy, follow TaleSpire's symbiote sideloading
docs and use `http://localhost:5173/manifest.json` as the manifest URL.

## Running tests

There is no automated test suite at this time — the symbiote is a thin shim
around TaleSpire's API and is exercised manually against a live board.

The `pre-push` Husky hook runs `npm test`; if/when tests are added, the gate
will activate. Don't bypass with `--no-verify`.

## Code conventions

- **No transpile step.** Write plain ESM JavaScript that the browser can load
  directly. Use `import { ... } from './foo.js'` (with the `.js` extension).
- **File size:** 800 lines hard maximum.
- **No external runtime dependencies** beyond what TaleSpire's symbiote
  sandbox provides. Everything that ships must be in-repo.
- **Manifest changes:** if you change `manifest.json`, update the README and
  any sideload instructions to match.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/). Type
prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`,
`perf`, `style`, `revert`. Keep the subject lower-case and under ~100 chars.

Examples:

```
feat: relay TaleSpire dice rolls to platform chat
fix: re-establish socket on board reload
docs: add sideloading instructions
```

## Submitting a pull request

1. **Fork** the repo and branch from `main`:
   `git checkout -b feat/your-change`
2. **Test manually** against a live TaleSpire board where applicable;
   describe your test plan in the PR.
3. **Commit** using Conventional Commits.
4. **Open a PR** against `main`. Screenshots/clips are very welcome for
   anything that touches the UI surface.
5. **Be patient and responsive** during review.

## License

Contributions are accepted under [AGPL-3.0-only](LICENSE). By submitting a PR
you agree your contribution may be distributed under that license. See
[NOTICE](NOTICE) and [TRADEMARK.md](TRADEMARK.md) for attribution and
trademark policy.
