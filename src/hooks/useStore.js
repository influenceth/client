import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';

import constants from '~/lib/constants';

const {
  CHUNK_RESOLUTION,
  GRAPHICS_DEFAULTS,
  ENABLE_SHADOWS
} = constants;

// (keep these out of state so can change)
const sectionDefault = { active: false, expanded: true, highlighted: false };
const outlinerSectionDefaults = {
  wallet: { ...sectionDefault, active: true },
  log: { ...sectionDefault, active: true },
  filters: { ...sectionDefault, active: true },
  mappedAsteroids: { ...sectionDefault, active: true },
  selectedAsteroid: { ...sectionDefault },
  ownedAsteroids: { ...sectionDefault },
  ownedCrew: { ...sectionDefault },
  crewAssignments: { ...sectionDefault },
  watchlist: { ...sectionDefault },
  routePlanner: { ...sectionDefault },
  timeControl: { ...sectionDefault }
};

const useStore = create(persist((set, get) => ({
    asteroids: {
      origin: null,
      zoomStatus: 'out', // out -> zooming-in -> in -> zooming-out -> out
      zoomedFrom: null,
      destination: null,
      hovered: null,
      filters: {},
      highlight: null,
      sceneMod: null,
      owned: {
        mapped: false,
        filtered: false,
        highlighted: false,
        highlightColor: '#AB149E'
      },
      watched: {
        mapped: false,
        filtered: false,
        highlighted: false,
        highlightColor: '#AB149E'
      },
    },

    auth: {
      token: null,
      lastWallet: null
    },

    hasSeenIntroVideo: false,
    cutscenePlaying: false,

    logs: {
      alerts: []
    },

    timeOverride: null,

    draggables: {},

    outliner: {
      pinned: true,
      ...outlinerSectionDefaults
    },

    graphics: {
      fov: 75,
      lensflare: true,
      skybox: true,
      // (these will default per the gpu tier):
      shadowQuality: undefined,
      textureQuality: undefined,
    },

    pendingTransactions: [],

    sounds: {
      music: 100,
      effects: 100,
      toPlay: null
    },

    sale: false,

    referrer: null,

    //
    // DISPATCHERS

    dispatchGpuInfo: (gpuInfo) => set(produce(state => {
      // this sets defaults if they are not already
      const defaults = GRAPHICS_DEFAULTS[gpuInfo.tier] || {};
      Object.keys(defaults).forEach((k) => {
        if (!state.graphics.hasOwnProperty(k) || state.graphics[k] === undefined) {
          state.graphics[k] = defaults[k];
        }
      });
    })),

    dispatchSaleStarted: () => set(produce(state => {
      state.sale = true;
    })),

    dispatchSaleEnded: () => set(produce(state => {
      state.sale = false;
    })),

    dispatchSoundPlayed: () => set(produce(state => {
      state.sounds.toPlay = null;
    })),

    dispatchSoundRequested: (sound) => set(produce(state => {
      state.sounds.toPlay = sound;
    })),

    dispatchMusicVolumeSet: (volume) => set(produce(state => {
      state.sounds.music = volume;
    })),

    dispatchEffectsVolumeSet: (volume) => set(produce(state => {
      state.sounds.effects = volume;
    })),

    dispatchAlertLogged: (alert) => set(produce(state => {
      state.logs.alerts.unshift(alert);
    })),

    dispatchAlertNotified: (alert) => set(produce(state => {
      const index = state.logs.alerts.findIndex(a => a.type === alert.type && a.timestamp === alert.timestamp);
      state.logs.alerts.splice(index, 1);
    })),

    dispatchDraggableClose: (id) => set(produce(state => {
      delete state.draggables[id];
    })),

    dispatchDraggableOpen: (type, params) => set(produce(state => {
      const id = Date.now();
      state.draggables[id] = {
        type,
        params,
        position: { x: 0, y: 0 }, // TODO: ...
        index: Object.values(state.draggables).reduce((acc, cur) => acc < cur.index ? cur.index : acc, 0) + 1,
      };
    })),

    dispatchDraggableToFront: (id) => set(produce(state => {
      if (state.draggables[id]) {
        const maxIndex = Object.values(state.draggables).reduce((acc, cur) => acc < cur.index ? cur.index : acc, 0);
        if (state.draggables[id].index < maxIndex) {
          state.draggables[id].index = maxIndex + 1;
        }
      }
    })),

    dispatchDraggableMoved: (id, position) => set(produce(state => {
      if (state.draggables[id]) {
        state.draggables[id].position = position;
      }
    })),

    dispatchOutlinerPinned: () => set(produce(state => {
      state.outliner.pinned = true;
    })),

    dispatchOutlinerUnpinned: () => set(produce(state => {
      state.outliner.pinned = false;
    })),

    dispatchOutlinerSectionActivated: (section) => set(produce(state => {
      if (!state.outliner[section]) state.outliner[section] = { ...outlinerSectionDefaults[section] };
      state.outliner[section].active = true;
      state.outliner[section].expanded = true;
      state.outliner[section].highlighted = true;
      state.outliner.pinned = true;
      setTimeout(() => {
        set(produce(state => { state.outliner[section].highlighted = false; }));
      }, 0);
    })),

    dispatchOutlinerSectionDeactivated: (section) => set(produce(state => {
      if (!state.outliner[section]) state.outliner[section] = { ...outlinerSectionDefaults[section] };
      state.outliner[section].active = false;
    })),

    dispatchOutlinerSectionExpanded: (section) => set(produce(state => {
      if (!state.outliner[section]) state.outliner[section] = { ...outlinerSectionDefaults[section] };
      state.outliner[section].expanded = true;
    })),

    dispatchOutlinerSectionCollapsed: (section) => set(produce(state => {
      if (!state.outliner[section]) state.outliner[section] = { ...outlinerSectionDefaults[section] };
      state.outliner[section].expanded = false;
    })),

    dispatchTextureQualitySet: (quality) => set(produce(state => {
      state.graphics.textureQuality = quality;
    })),

    dispatchSkyboxHidden: () => set(produce(state => {
      state.graphics.skybox = false;
    })),

    dispatchSkyboxUnhidden: () => set(produce(state => {
      state.graphics.skybox = true;
    })),

    dispatchLensflareHidden: () => set(produce(state => {
      state.graphics.lensflare = false;
    })),

    dispatchLensflareUnhidden: () => set(produce(state => {
      state.graphics.lensflare = true;
    })),

    // 0 is off, 1 is low, 2 is mid, 3 is high
    dispatchShadowQualitySet: (level) => set(produce(state => {
      state.graphics.shadowQuality = level;
    })),

    dispatchFOVSet: (fov) => set(produce(state => {
      if (fov < 45 || fov > 175) return;
      state.graphics.fov = fov;
    })),

    dispatchStatsOn: () => set(produce(state => {
      state.graphics.stats = true;
    })),

    dispatchStatsOff: () => set(produce(state => {
      state.graphics.stats = false;
    })),

    dispatchOriginSelected: (i) => set(produce(state => {
      if (Number(i) > 0 && Number(i) <= 250000) state.asteroids.origin = Number(i);
      state.asteroids.sceneMod = null;
    })),

    dispatchOriginCleared: () => set(produce(state => {
      state.asteroids.origin = null;
      state.asteroids.sceneMod = null;
    })),

    dispatchDestinationSelected: (i) => set(produce(state => {
      if (Number(i) > 0 && Number(i) <= 250000) state.asteroids.destination = Number(i);
    })),

    dispatchDestinationCleared: () => set(produce(state => {
      state.asteroids.destination = null;
    })),

    dispatchAsteroidHovered: (i) => set(produce(state => {
      state.asteroids.hovered = Number(i);
    })),

    dispatchAsteroidUnhovered: () => set(produce(state => {
      state.asteroids.hovered = null;
    })),

    dispatchZoomStatusChanged: (status) => set(produce(state => {
      state.asteroids.zoomStatus = status;
    })),

    dispatchAsteroidZoomedFrom: (from) => set(produce(state => {
      state.asteroids.zoomedFrom = from;
    })),

    dispatchFiltersUpdated: (filters) => set(produce(state => {
      state.asteroids.filters = filters;
    })),

    dispatchHighlightUpdated: (settings) => set(produce(state => {
      state.asteroids.highlight = settings;
    })),

    dispatchOwnedAsteroidsMapped: () => set(produce(state => {
      state.asteroids.owned.mapped = true;
    })),

    dispatchOwnedAsteroidsUnmapped: () => set(produce(state => {
      state.asteroids.owned.mapped = false;
    })),

    dispatchOwnedAsteroidsFiltered: () => set(produce(state => {
      state.asteroids.owned.filtered = true;
    })),

    dispatchOwnedAsteroidsUnfiltered: () => set(produce(state => {
      state.asteroids.owned.filtered = false;
    })),

    dispatchOwnedAsteroidColorChange: (color) => set(produce(state => {
      state.asteroids.owned.highlightColor = color;
    })),

    dispatchWatchedAsteroidsMapped: () => set(produce(state => {
      state.asteroids.watched.mapped = true;
    })),

    dispatchWatchedAsteroidsUnmapped: () => set(produce(state => {
      state.asteroids.watched.mapped = false;
    })),

    dispatchWatchedAsteroidsFiltered: () => set(produce(state => {
      state.asteroids.watched.filtered = true;
    })),

    dispatchWatchedAsteroidsUnfiltered: () => set(produce(state => {
      state.asteroids.watched.filtered = false;
    })),

    dispatchWatchedAsteroidColorChange: (color) => set(produce(state => {
      state.asteroids.watched.highlightColor = color;
    })),

    dispatchTimeOverride: (anchor, speed) => set((produce(state => {
      state.timeOverride = anchor ? { anchor, speed, ts: Date.now() } : null;
    }))),

    dispatchAuthenticated: (token) => set(produce(state => {
      state.auth.token = token;
    })),

    dispatchWalletConnected: (walletId) => set(produce(state => {
      state.auth.lastWallet = walletId;
    })),

    dispatchCutscenePlaying: (which) => set(produce(state => {
      state.cutscenePlaying = which;
    })),

    dispatchSeenIntroVideo: (which) => set(produce(state => {
      state.hasSeenIntroVideo = which;
    })),

    dispatchTokenInvalidated: () => set(produce(state => {
      state.auth.token = null;
    })),

    dispatchReferrerSet: (refCode) => set(produce(state => {
      state.referrer = refCode;
    })),

    dispatchSceneMod: (type, params) => set(produce(state => {
      state.asteroids.sceneMod = type ? { type, params } : null;
    })),

    //
    // SPECIAL GETTERS

    getShadowQuality: () => {
      const q = ENABLE_SHADOWS ? get().graphics?.shadowQuality : 0;
      if (q === 1) return { shadowMode: 1, shadowSize: 1024 };
      if (q === 2) return { shadowMode: 2, shadowSize: 2048 };
      if (q === 3) return { shadowMode: 2, shadowSize: 4096 };
      return { shadowMode: 0, shadowSize: 1024 };
    },

    getTerrainQuality: () => {
      const q = get().graphics?.textureQuality;
      if (q === 2) return { textureSize: 2 * CHUNK_RESOLUTION };
      if (q === 3) return { textureSize: 4 * CHUNK_RESOLUTION };
      return { textureSize: 1 * CHUNK_RESOLUTION };
    },

    dispatchPendingTransaction: ({ key, vars, txHash }) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      state.pendingTransactions.push({
        key,
        vars,
        txHash,
        timestamp: Date.now()
      });
    })),

    dispatchPendingTransactionUpdate: (txHash, params) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      const txIndex = state.pendingTransactions.findIndex((tx) => tx.txHash === txHash);
      state.pendingTransactions[txIndex] = {
        ...state.pendingTransactions[txIndex],
        ...params
      }
    })),

    dispatchPendingTransactionComplete: (txHash) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      state.pendingTransactions = state.pendingTransactions.filter((tx) => tx.txHash !== txHash);
    })),

}), {
  name: 'influence',
  version: 0,
  blacklist: [ 'timeOverride' ]
}));

export default useStore;
