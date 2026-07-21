#!/usr/bin/env node
/**
 * Install this repo into TaleSpire's local Symbiotes directory as symlinks, so
 * edits here are picked up by a symbiote reload with no build and no copy step.
 *
 * Usage:
 *   npm run link        → manifest.json     (entryPoint: production core)
 *   npm run link:dev    → manifest.dev.json (entryPoint: the local dev tunnel)
 *   npm run unlink      → remove both installs
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

import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INSTALL_NAMES = { prod: 'CFG Core', dev: 'CFG Core (dev)' }

/** TaleSpire's per-user local symbiote directory (NOT primary/CommunityContent, which is mod.io's). */
function symbiotesDir() {
  switch (platform()) {
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'com.bouncyrock.talespire', 'Symbiotes')
    case 'win32':
      return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'TaleSpire', 'Symbiotes')
    default:
      return join(homedir(), '.config', 'unity3d', 'BouncyRock Entertainment', 'TaleSpire', 'Symbiotes')
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

const mode = process.argv.includes('--dev') ? 'dev' : 'prod'
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

// manifest.json is the only file whose source differs between dev and prod.
const manifestSource = mode === 'dev' ? 'manifest.dev.json' : 'manifest.json'
symlinkSync(join(REPO, manifestSource), join(dest, 'manifest.json'))
symlinkSync(join(REPO, 'README.md'), join(dest, 'README.md'))
symlinkSync(join(REPO, 'icons'), join(dest, 'icons'), 'dir')

console.log(`Linked ${INSTALL_NAMES[mode]} (${mode}) → ${dest}`)
console.log(`  manifest.json → ${manifestSource}`)
for (const entry of readdirSync(dest)) console.log(`  ${entry}`)
console.log('\nRestart TaleSpire (or use the symbiote reload control) to pick it up.')
