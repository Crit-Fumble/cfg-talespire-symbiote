'use strict'

// TaleSpire Bridge - PostMessage communication layer (ts: prefix protocol)
// Enables secure iframe <-> TaleSpire API communication via postMessage.

var ALLOWED_ORIGINS = [
  'https://core.crit-fumble.com',
  'https://staging.crit-fumble.com',
  'http://localhost:3000',
  'http://localhost:10000',
  'http://127.0.0.1:3000',
]

var API_METHODS = {
  // ── Identity ────────────────────────────────────────────────────────────
  'players.whoAmI': function () {
    return TS.players.whoAmI()
  },
  'players.getCurrent': function () {
    return TS.players.getPlayersInThisCampaign()
  },
  'players.isGm': function () {
    return TS.players.isGm()
  },
  'campaigns.whereAmI': function () {
    return TS.campaigns.whereAmI()
  },
  'boards.whereAmI': function () {
    return TS.boards.whereAmI()
  },

  // ── Creatures ───────────────────────────────────────────────────────────
  'creatures.getSelected': function () {
    return TS.creatures.getSelectedCreatures()
  },

  // ── Chat & notifications ────────────────────────────────────────────────
  'chat.send': function (p) {
    return TS.chat.send(p.content)
  },
  notify: function (p) {
    return TS.symbiote.sendNotification(p.title || 'CFG Core', p.body || p.message, p.data || '')
  },

  // ── Storage (global = cross-campaign, campaign = per-campaign) ──────────
  'localStorage.global.get': function () {
    return TS.localStorage.global.getBlob()
  },
  'localStorage.global.set': function (p) {
    return TS.localStorage.global.setBlob(p.value)
  },
  'localStorage.get': function () {
    return TS.localStorage.campaign.getBlob()
  },
  'localStorage.set': function (p) {
    return TS.localStorage.campaign.setBlob(p.value)
  },

  // ── URL & external browser ─────────────────────────────────────────────
  openUrl: function (p) {
    window.open(p.url, '_blank')
    return true
  },
  'urls.createPrefix': function () {
    return TS.symbiote.urls.createUrlPrefixForThisSymbiote()
  },

  // ── Clipboard ──────────────────────────────────────────────────────────
  'clipboard.setText': function (p) {
    return TS.system.clipboard.setText(p.text)
  },
}

var SUBSCRIBABLE_EVENTS = {
  'dice.rollResults': function (cb) {
    return TS.dice.onRollResults(cb)
  },
  'chat.newMessage': function (cb) {
    return TS.chat.onNewMessage(cb)
  },
  'creatures.stateChanges': function (cb) {
    return TS.creatures.onStateChanges(cb)
  },
  'initiative.queueUpdates': function (cb) {
    return TS.initiative.onQueueUpdates(cb)
  },
  'sync.message': function (cb) {
    return TS.sync.onMessage(cb)
  },
  'urls.message': function (cb) {
    return TS.symbiote.urls.onUrlMessage(cb)
  },
}

/** @constructor */
export function TSBridge() {
  this._iframe = null
  this._origin = null
  this._subscriptions = {} // eventType -> unsubscribe fn
  this._ready = false
  this._boundHandler = null
}

/** Attach the bridge to an iframe and begin listening for messages. */
TSBridge.prototype.initialize = function (iframe, origin) {
  var self = this

  // Validate origin
  var originBase = origin.replace(/\/$/, '')
  if (ALLOWED_ORIGINS.indexOf(originBase) === -1) {
    console.warn('[TSBridge] Refusing untrusted origin: ' + originBase)
    return
  }

  this._iframe = iframe
  this._origin = originBase
  this._boundHandler = function (event) {
    self._handleMessage(event)
  }

  window.addEventListener('message', this._boundHandler)

  iframe.addEventListener('load', function () {
    self._sendReady()
  })

  console.log('[TSBridge] Initialized, target origin: ' + originBase)
}

/** Tear down the bridge: unsubscribe all TS events, remove listener. */
TSBridge.prototype.destroy = function () {
  this._unsubscribeAll()

  if (this._boundHandler) {
    window.removeEventListener('message', this._boundHandler)
    this._boundHandler = null
  }

  this._iframe = null
  this._origin = null
  this._ready = false
  console.log('[TSBridge] Destroyed')
}

/** @private Send ts:ready with player info to the iframe. */
TSBridge.prototype._sendReady = function () {
  var self = this

  // TS API methods may return Promises — resolve before sending via postMessage
  var playerInfoP
  try {
    playerInfoP = TS.players.getPlayersInThisCampaign()
  } catch (e) {
    playerInfoP = Promise.resolve(null)
  }

  var isGmP
  try {
    isGmP = TS.players.isGm()
  } catch (e) {
    isGmP = Promise.resolve(false)
  }

  Promise.all([
    Promise.resolve(playerInfoP).catch(function () {
      return null
    }),
    Promise.resolve(isGmP).catch(function () {
      return false
    }),
  ]).then(function (results) {
    self._sendToFrame({
      type: 'ts:ready',
      payload: {
        players: results[0],
        isGm: !!results[1],
      },
    })
    console.log('[TSBridge] Sent ts:ready')
  })
}

/** @private Post a message to the iframe contentWindow. */
TSBridge.prototype._sendToFrame = function (message) {
  if (this._iframe && this._iframe.contentWindow && this._origin) {
    this._iframe.contentWindow.postMessage(message, this._origin)
  }
}

/** @private Process an incoming postMessage event. */
TSBridge.prototype._handleMessage = function (event) {
  // Validate origin
  if (ALLOWED_ORIGINS.indexOf(event.origin) === -1) {
    return
  }

  // Validate source is our iframe
  if (!this._iframe || event.source !== this._iframe.contentWindow) {
    return
  }

  var data = event.data
  if (!data || !data.type) {
    return
  }

  var msgType = data.type

  if (msgType === 'ts:init') {
    this._ready = true
    console.log('[TSBridge] Handshake complete (ts:init received)')
    return
  }

  if (msgType === 'ts:request') {
    this._handleRequest(data)
    return
  }

  if (msgType === 'ts:subscribe') {
    this._subscribe(data.event)
    return
  }

  if (msgType === 'ts:unsubscribe') {
    this._unsubscribe(data.event)
    return
  }
}

/** @private Handle a ts:request: call the API method and reply. */
TSBridge.prototype._handleRequest = function (data) {
  var self = this
  var method = data.method
  var params = data.params
  var requestId = data.requestId

  var handler = API_METHODS[method]
  if (!handler) {
    self._sendToFrame({
      type: 'ts:error',
      requestId: requestId,
      error: 'Unknown method: ' + method,
    })
    return
  }

  // Wrap in Promise.resolve to handle both sync and async returns
  Promise.resolve()
    .then(function () {
      return handler(params)
    })
    .then(function (result) {
      self._sendToFrame({
        type: 'ts:response',
        requestId: requestId,
        result: result,
      })
    })
    .catch(function (err) {
      console.error('[TSBridge] Error handling ' + method + ':', err)
      self._sendToFrame({
        type: 'ts:error',
        requestId: requestId,
        error: err.message || String(err),
      })
    })
}

/** @private Subscribe to a TS event and forward it to the iframe as ts:event. */
TSBridge.prototype._subscribe = function (eventType) {
  // Already subscribed
  if (this._subscriptions[eventType]) {
    return
  }

  var registrar = SUBSCRIBABLE_EVENTS[eventType]
  if (!registrar) {
    console.warn('[TSBridge] Unknown event type: ' + eventType)
    return
  }

  var self = this
  var unsub = registrar(function (eventData) {
    self._sendToFrame({
      type: 'ts:event',
      event: eventType,
      data: eventData,
    })
  })

  this._subscriptions[eventType] = unsub
  console.log('[TSBridge] Subscribed to ' + eventType)
}

/** @private Unsubscribe from a single TaleSpire event. */
TSBridge.prototype._unsubscribe = function (eventType) {
  var unsub = this._subscriptions[eventType]
  if (unsub) {
    try {
      unsub()
    } catch (e) {
      console.warn('[TSBridge] Error unsubscribing from ' + eventType + ':', e)
    }
    delete this._subscriptions[eventType]
    console.log('[TSBridge] Unsubscribed from ' + eventType)
  }
}

/** @private Unsubscribe from all TaleSpire events. */
TSBridge.prototype._unsubscribeAll = function () {
  var keys = Object.keys(this._subscriptions)
  for (var i = 0; i < keys.length; i++) {
    this._unsubscribe(keys[i])
  }
}
