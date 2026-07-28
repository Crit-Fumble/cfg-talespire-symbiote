#!/usr/bin/env node
/**
 * Install this repo into TaleSpire's local Symbiotes directory as symlinks, so
 * edits here are picked up by a symbiote reload with no build and no copy step.
 *
 * Usage:
 *   npm run link        → manifest.json     (entryPoint: production core)
 *   npm run link:dev    → manifest.dev.json (entryPoint: the local dev tunnel)
 *   npm run link:e2e    → manifest.e2e.json (entryPoint: the local e2e stack :11000 —
 *                         Playwright drives this install over TaleSpire's CEF debugger)
 *   npm run unlink      → remove all installs
 *
 * The installed directory contains a symlink per file rather than one symlink to
 * the repo, so the dev/prod manifest choice is just which file `manifest.json`
 * points at. TaleSpire only ever reads `manifest.json`.
 *
 * dev and prod install to SEPARATE directories so both can be present at once —
 * running one mode must never clobber the other's install. They also carry
 * different `api.interop.id` values, so TS.sync traffic cannot cross between
 * them and neither can claim the other's symbiote-scoped storage.
 */

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INSTALL_NAMES = { prod: 'CFG Core', dev: 'CFG Core (dev)', e2e: 'CFG Core (e2e)' }
const MANIFEST_SOURCES = { prod: 'manifest.json', dev: 'manifest.dev.json', e2e: 'manifest.e2e.json' }

/**
 * TaleSpire's per-user local symbiote directory (NOT primary/Mods, which is
 * mod.io's). On Windows this is Unity's persistentDataPath under **LocalLow** —
 * not %APPDATA%/Roaming, which this script previously pointed at; the install
 * "succeeded" into a directory TaleSpire never reads.
 */
function symbiotesDir() {
  switch (platform()) {
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'com.bouncyrock.talespire', 'Symbiotes')
    case 'win32':
      return join(homedir(), 'AppData', 'LocalLow', 'BouncyRock Entertainment', 'TaleSpire', 'Symbiotes')
    default:
      return join(homedir(), '.config', 'unity3d', 'BouncyRock Entertainment', 'TaleSpire', 'Symbiotes')
  }
}

/**
 * Symlink when the OS allows it, copy when it doesn't.
 *
 * On Windows, creating symlinks needs Developer Mode or elevation; without
 * either, symlinkSync throws EPERM. A copy install is a perfectly good
 * fallback — the symbiote app itself is REMOTE (entryPoint is a URL), so the
 * only thing a stale copy can miss is a manifest/icon change, and those change
 * rarely. Re-run `npm run link[:dev]` after editing the manifest to refresh.
 */
let installMode = 'symlink'
function install(src, dst, type) {
  try {
    symlinkSync(src, dst, type)
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EINVAL') throw err
    installMode = 'copy'
    cpSync(src, dst, { recursive: true })
  }
}

/** Remove a path whether it is a file, directory, or dangling symlink. */
function remove(path) {
  if (!existsSync(path) && !isLink(path)) return
  if (isLink(path)) unlinkSync(path)
  else rmSync(path, { recursive: true, force: true })
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

const mode = process.argv.includes('--e2e') ? 'e2e' : process.argv.includes('--dev') ? 'dev' : 'prod'
const dest = join(symbiotesDir(), INSTALL_NAMES[mode])

if (process.argv.includes('--remove')) {
  // Remove both installs — "unlink" should leave nothing behind, and which one
  // you meant is ambiguous once the two can coexist.
  for (const name of Object.values(INSTALL_NAMES)) {
    const path = join(symbiotesDir(), name)
    if (existsSync(path) || isLink(path)) {
      remove(path)
      console.log(`Removed ${path}`)
    }
  }
  process.exit(0)
}

const parent = symbiotesDir()
if (!existsSync(parent)) {
  console.error(`TaleSpire Symbiotes directory not found: ${parent}\nIs TaleSpire installed and has it been run at least once?`)
  process.exit(1)
}

remove(dest)
mkdirSync(dest, { recursive: true })

// manifest.json is the only file whose source differs between the modes.
const manifestSource = MANIFEST_SOURCES[mode]
install(join(REPO, manifestSource), join(dest, 'manifest.json'))
install(join(REPO, 'README.md'), join(dest, 'README.md'))
install(join(REPO, 'icons'), join(dest, 'icons'), 'dir')

console.log(`${installMode === 'symlink' ? 'Linked' : 'Copied'} ${INSTALL_NAMES[mode]} (${mode}) → ${dest}`)
console.log(`  manifest.json → ${manifestSource}`)
for (const entry of readdirSync(dest)) console.log(`  ${entry}`)
if (installMode === 'copy') {
  console.log('\n  (copy install — symlinks need Windows Developer Mode; re-run this after manifest/icon edits)')
}
console.log('\nRestart TaleSpire (or use the symbiote reload control) to pick it up.')
