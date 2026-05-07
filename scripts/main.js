'use strict'

import { TSBridge } from './bridge.js'

// ── Configuration ────────────────────────────────────────────────────────────
// Change CORE_URL to your dev tunnel or prod URL.
// For local dev:  'https://cfg-localdev.crit-fumble-web.workers.dev'
// For production: 'https://core.crit-fumble.com'
// TODO: Don't commit this with the local dev URL, or add a build step to replace it.
var CORE_URL = 'https://cfg-localdev.crit-fumble-web.workers.dev'

var bridge = new TSBridge()

function loadFrame(coreUrl) {
  // In TaleSpire's Chromium, Next.js dev server blocks iframe cross-origin asset requests.
  // For dev, navigate directly instead of using an iframe. The TS.* bridge won't work
  // in this mode, but auth + campaign linking can be tested.
  // In production, the iframe approach works fine (no dev server origin checks).
  var useDirectNav = coreUrl.indexOf('localdev') !== -1 || coreUrl.indexOf('localhost') !== -1

  if (useDirectNav) {
    console.log('[CFG] Dev mode: navigating directly to ' + coreUrl + '/talespire/')
    window.location.href = coreUrl + '/talespire/'
    return
  }

  var iframe = document.getElementById('core-frame')
  iframe.src = coreUrl + '/talespire/'
  bridge.initialize(iframe, coreUrl)
  console.log('[CFG] Loading ' + coreUrl + '/talespire/')
}

function init() {
  console.log('[CFG] Symbiote initializing...')

  // Check for URL override in TS localStorage (if TS is available)
  var coreUrl = CORE_URL
  try {
    if (typeof TS !== 'undefined' && TS.localStorage && TS.localStorage.campaign) {
      var stored = TS.localStorage.campaign.getBlob()
      if (stored) {
        var config = JSON.parse(stored)
        if (config.coreUrl) coreUrl = config.coreUrl
      }
    }
  } catch (e) {
    /* use default */
  }

  loadFrame(coreUrl)
  window.CFGCore = { bridge: bridge, url: coreUrl }
}

if (typeof TS !== 'undefined' && typeof TS.onReady === 'function') {
  TS.onReady(init)
} else if (typeof TS !== 'undefined' && TS.symbiote && typeof TS.symbiote.onReady === 'function') {
  TS.symbiote.onReady(init)
} else {
  console.warn('[CFG] TS API not detected — running standalone')
  document.addEventListener('DOMContentLoaded', init)
}
