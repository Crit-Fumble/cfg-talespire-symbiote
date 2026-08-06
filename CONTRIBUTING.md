# Contributing to @crit-fumble/talespire-symbiote

Thanks for your interest in contributing. This is the TaleSpire symbiote that
connects a TaleSpire board to the Crit-Fumble platform — syncing dice, chat,
initiative, and more.

## Local dev setup

This repo ships **no application code** — only the manifests
(`manifest.json` / `manifest.dev.json`), icons, and a local install helper.
`entryPoint` is a remote URL, so TaleSpire loads the symbiote UI straight from
`cfg-core-browser` (see the README's "How it works"). Most symbiote *feature*
work therefore happens in `cfg-core-browser`
(`src/clients/browser/talespire-api.ts`, `src/views/talespire/*`); changes
land here only when the manifest contract (subscriptions, icons, metadata)
moves with them.

You need:

- **Node.js** (any recent LTS — only for the install helper)
- **TaleSpire** (Windows) to load the symbiote against a live board

```bash
# Clone, then:
npm install
npm run link:dev   # install into TaleSpire pointing at the local dev tunnel
npm run link       # …or pointing at production
npm run unlink     # remove again
```

`link` symlinks the repo into TaleSpire's `Symbiotes` directory, so manifest
edits need only a symbiote reload — and because `entryPoint` is remote, UI
changes need no relink at all. The README covers running the dev and
production installs side by side.

## Running tests

There is no automated test suite — the repo is a manifest + icons, exercised
manually against a live board. The Husky hooks run a secret scan on commit;
the `pre-push` hook is a placeholder that will start gating pushes if tests
are ever added.

## Code conventions

- **Manifest changes:** if you change `manifest.json`, mirror the change in
  `manifest.dev.json`, keep the subscription table in the README in sync, and
  remember every `api.subscriptions` entry must match a global function
  installed by `cfg-core-browser`'s `installTalespireEventBridge()` — adding
  an event means editing both repos.
- **No application code here.** If you're writing UI or `TS.*` calls, the
  change belongs in `cfg-core-browser`.

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

1. **Fork** the repo and branch from `next` (the release-candidate branch):
   `git checkout -b feat/your-change`
2. **Test manually** against a live TaleSpire board where applicable;
   describe your test plan in the PR.
3. **Commit** using Conventional Commits.
4. **Open a PR** against `next` (never `main` — it is released truth and is
   only ever fast-forwarded to). Screenshots/clips are very welcome for
   anything that touches the UI surface.
5. **Be patient and responsive** during review.

## License

Contributions are accepted under [AGPL-3.0-only](LICENSE). By submitting a PR
you agree your contribution may be distributed under that license. See
[NOTICE](NOTICE) and [TRADEMARK.md](TRADEMARK.md) for attribution and
trademark policy.
