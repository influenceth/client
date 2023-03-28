import create from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import produce from 'immer';

import constants from '~/lib/constants';

const {
  CHUNK_RESOLUTION,
  GRAPHICS_DEFAULTS,
  ENABLE_SHADOWS,
  MIN_FOV,
  MAX_FOV
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

const assetSearchDefaults = {
  asteroids: { filters: {}, mapFilters: {}, sort: ['r', 'desc'], mapSort: ['r', 'desc'], highlight: null },
  buildings: { filters: {}, sort: ['i', 'asc'] },
  coresamples: { filters: { status: '2,3' }, sort: ['i', 'asc'] },
  crewmates: { filters: {}, sort: ['i', 'asc'] },
  crews: { filters: {}, sort: ['i', 'asc'] },
  ships: { filters: {}, sort: ['i', 'asc'] },
  orders: { filters: {}, sort: ['i', 'asc'] },
  leases: { filters: {}, sort: ['i', 'asc'] },
  lots: { filters: {}, mapFilters: {}, sort: ['i', 'asc'], highlight: null },
};

const useStore = create(subscribeWithSelector(persist((set, get) => ({
    actionDialog: {},
    launcherPage: null,
    openHudMenu: null,

    asteroids: {
      origin: null,
      zoomStatus: 'out', // out -> zooming-in -> in -> zooming-out -> out
      zoomedFrom: null,
      destination: null,
      hovered: null,
      lot: null,
      lotDestination: null,
      resourceMap: {
        active: false,
        selected: null
      },
      zoomToLot: null,
      owned: {
        highlighted: false,
        highlightColor: '#AB149E'
      },
      watched: {
        highlighted: false,
        highlightColor: '#AB149E'
      },
    },

    assetSearch: {
      ...assetSearchDefaults
    },

    auth: {
      token: null
    },

    selectedCrewId: null,

    cameraNeedsReorientation: false,

    hasSeenIntroVideo: false,
    cutscenePlaying: false,
    canvasStack: [],

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
      autodetect: true,
      fov: 75,
      lensflare: true,
      skybox: true,
      // (these will default per the gpu tier):
      shadowQuality: undefined,
      textureQuality: undefined,
    },

    failedTransactions: [],
    pendingTransactions: [],

    lotLoader: {
      i: null,
      progress: 0
    },

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

    dispatchActionDialog: (type, params = {}) => set(produce(state => {
      state.actionDialog = { type, params };
    })),

    dispatchLauncherPage: (page) => set(produce(state => {
      if (page === 'store' || page === 'wallets' || page === 'settings') state.launcherPage = page;
      else if (page) state.launcherPage = 'account';
      else state.launcherPage = null;
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

    dispatchHudMenuOpened: (section) => set(produce(state => {
      state.openHudMenu = section;
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

    dispatchGraphicsAutodetectSet: (which, gpuInfo) => set(produce(state => {
      state.graphics.autodetect = which;
      if (state.graphics.autodetect) {
        const defaults = GRAPHICS_DEFAULTS[gpuInfo.tier] || {};
        Object.keys(defaults).forEach((k) => {
          state.graphics[k] = defaults[k];
        });
      }
    })),

    dispatchHideInterface: () => set(produce(state => {
      state.graphics.hideInterface = true;
    })),

    dispatchShowInterface: () => set(produce(state => {
      state.graphics.hideInterface = false;
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
      if (fov < MIN_FOV || fov > MAX_FOV) return;
      state.graphics.fov = fov;
    })),

    dispatchStatsOn: () => set(produce(state => {
      state.graphics.stats = true;
    })),

    dispatchStatsOff: () => set(produce(state => {
      state.graphics.stats = false;
    })),

    dispatchOriginSelected: (i) => set(produce(state => {
      state.asteroids.origin = null;
      if (i && Number(i) > 0 && Number(i) <= 250000) {
        state.asteroids.origin = Number(i);
      }
      state.asteroids.lot = null;
      state.asteroids.lotDestination = null;
      state.asteroids.zoomToLot = null;
    })),

    dispatchDestinationSelected: (i) => set(produce(state => {
      state.asteroids.destination = null;
      if (i && Number(i) > 0 && Number(i) <= 250000) {
        state.asteroids.destination = Number(i);
      }
    })),

    dispatchAsteroidHovered: (i) => set(produce(state => {
      state.asteroids.hovered = Number(i);
    })),

    dispatchAsteroidUnhovered: () => set(produce(state => {
      state.asteroids.hovered = null;
    })),

    dispatchZoomStatusChanged: (status, maintainLot) => set(produce(state => {
      state.asteroids.zoomStatus = status;
      state.asteroids.lotDestination = null;
      if (!maintainLot) {
        state.asteroids.lot = null;
        state.asteroids.zoomToLot = null;
      }
    })),

    dispatchAsteroidZoomedFrom: (from) => set(produce(state => {
      state.asteroids.zoomedFrom = from;
    })),

    dispatchFiltersUpdated: (assetType) => (filters) => set(produce(state => {
      state.assetSearch[assetType].filters = filters;
    })),

    dispatchSortUpdated: (assetType) => (sort) => set(produce(state => {
      state.assetSearch[assetType].sort = sort;
    })),

    dispatchMapFiltersUpdated: (assetType) => (filters) => set(produce(state => {
      state.assetSearch[assetType].mapFilters = filters;
    })),

    dispatchMapSortUpdated: (assetType) => (sort) => set(produce(state => {
      state.assetSearch[assetType].mapSort = sort;
    })),

    dispatchHighlightUpdated: (assetType) => (settings) => set(produce(state => {
      state.assetSearch[assetType].highlight = settings;
    })),

    // dispatchOwnedAsteroidsMapped: () => set(produce(state => {
    //   state.asteroids.owned.mapped = true;
    // })),

    // dispatchOwnedAsteroidsUnmapped: () => set(produce(state => {
    //   state.asteroids.owned.mapped = false;
    // })),

    // dispatchOwnedAsteroidsFiltered: () => set(produce(state => {
    //   state.asteroids.owned.filtered = true;
    // })),

    // dispatchOwnedAsteroidsUnfiltered: () => set(produce(state => {
    //   state.asteroids.owned.filtered = false;
    // })),

    dispatchOwnedAsteroidColorChange: (color) => set(produce(state => {
      state.asteroids.owned.highlightColor = color;
    })),

    // dispatchWatchedAsteroidsMapped: () => set(produce(state => {
    //   state.asteroids.watched.mapped = true;
    // })),

    // dispatchWatchedAsteroidsUnmapped: () => set(produce(state => {
    //   state.asteroids.watched.mapped = false;
    // })),

    // dispatchWatchedAsteroidsFiltered: () => set(produce(state => {
    //   state.asteroids.watched.filtered = true;
    // })),

    // dispatchWatchedAsteroidsUnfiltered: () => set(produce(state => {
    //   state.asteroids.watched.filtered = false;
    // })),

    dispatchWatchedAsteroidColorChange: (color) => set(produce(state => {
      state.asteroids.watched.highlightColor = color;
    })),

    dispatchTimeOverride: (anchor, speed) => set((produce(state => {
      state.timeOverride = anchor ? { anchor, speed, ts: Date.now() } : null;
    }))),

    dispatchAuthenticated: (token) => set(produce(state => {
      state.auth.token = token;
    })),

    dispatchTokenInvalidated: () => set(produce(state => {
      state.auth.token = null;
    })),

    dispatchCrewSelected: (crewId) => set(produce(state => {
      state.selectedCrewId = crewId;
    })),

    dispatchCutscene: (source, allowSkip) => set(produce(state => {
      state.cutscene = source ? { source, allowSkip: allowSkip || false } : null;
    })),

    dispatchSeenIntroVideo: (which) => set(produce(state => {
      state.hasSeenIntroVideo = which;
    })),

    dispatchReferrerSet: (refCode) => set(produce(state => {
      state.referrer = refCode;
    })),

    dispatchResourceMapToggle: (which) => set(produce(state => {
      state.asteroids.resourceMap.active = which;
    })),

    dispatchResourceMapSelect: (resourceId) => set(produce(state => {
      state.asteroids.resourceMap.selected = Number(resourceId);
      if (!resourceId) state.asteroids.resourceMap.active = false;
    })),

    dispatchLotsLoading: (i, progress = 0, simulateTarget = 0) => set(produce(state => {
      if (simulateTarget) {
        state.lotLoader = { i, progress: state.lotLoader.progress + (simulateTarget - state.lotLoader.progress) / 3 };
      } else {
        state.lotLoader = { i, progress: progress > 0.99 ? 1 : progress };
      }
    })),

    dispatchLotSelected: (asteroidId, lotId) => set(produce(state => {
      state.asteroids.lot = asteroidId && lotId ? { asteroidId, lotId } : null;
      state.asteroids.zoomToLot = null;
    })),

    dispatchReorientCamera: (needsReorienting) => set(produce(state => {
      state.cameraNeedsReorientation = !!needsReorienting;
    })),

    //
    // SPECIAL GETTERS

    getShadowQuality: () => {
      // NOTE: 0 is no shadows, 1 is single-light shadows, 2 is CSMs
      //       (support for CSMs has been removed because it was non-performant and didn't look great)
      const q = ENABLE_SHADOWS ? get().graphics?.shadowQuality : 0;
      if (q === 1) return { shadowMode: 1, shadowSize: 1024 };
      if (q === 2) return { shadowMode: 2, shadowSize: 2048 };
      if (q === 3) return { shadowMode: 2, shadowSize: 4096 };
      return { shadowMode: 0, shadowSize: 1024 };
    },

    getTerrainQuality: () => {
      const q = get().graphics?.textureQuality;
      if (q === 2) return { textureSize: 2 * CHUNK_RESOLUTION - 3 };
      if (q === 3) return { textureSize: 4 * CHUNK_RESOLUTION - 3 };
      return { textureSize: 1 * CHUNK_RESOLUTION - 3 };
    },

    dispatchFailedTransaction: ({ key, vars, txHash, err }) => set(produce(state => {
      if (!state.failedTransactions) state.failedTransactions = [];
      state.failedTransactions.push({
        key,
        vars,
        err,
        txHash,
        timestamp: Date.now()
      });
    })),

    dispatchFailedTransactionDismissed: (txHashOrTimestamp) => set(produce(state => {
      if (!state.failedTransactions) state.failedTransactions = [];
      state.failedTransactions = state.failedTransactions.filter((tx) => tx.txHash !== txHashOrTimestamp && tx.timestamp !== txHashOrTimestamp);
    })),

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

    dispatchCanvasStacked: (id) => set(produce(state => {
      if (!state.canvasStack) state.canvasStack = [];
      state.canvasStack.unshift(id);
    })),

    dispatchCanvasUnstacked: (id) => set(produce(state => {
      if (!state.canvasStack) state.canvasStack = [];
      state.canvasStack = state.canvasStack.filter((s) => s !== id);
    })),

    dispatchClearTransactionHistory: () => set(produce(state => {
      state.pendingTransactions = [];
      state.failedTransactions = [];
    })),

    dispatchZoomToLot: (isZoomed) => set(produce(state => {
      state.asteroids.zoomToLot = isZoomed;
    }))

}), {
  name: 'influence',
  version: 2,
  migrate: (persistedState, oldVersion) => {
    const migrations = [
      (state, version) => {
        if (version >= 1) return;
        const active = state.asteroids.mapResourceId ? true : false;
        const selected = state.asteroids.mapResourceId || null;
        state.asteroids.resourceMap = { active, selected };
        return state;
      },
      (state, version) => {
        if (version >= 2) return;
        state.assetSearch = { ...assetSearchDefaults };
        return state;
      },
    ];

    for (let i = 0; i < migrations.length; i++) {
      persistedState = migrations[i](persistedState, oldVersion);
    }

    return persistedState;
  },
  blacklist: [
    // TODO: should these be stored elsewhere if ephemeral?
    // TODO: the nested values are not supported by zustand
    'actionDialog',
    'asteroids.hovered',
    'asteroids.lot',
    'asteroids.lotDestination',
    'asteroids.zoomToLot',
    'canvasStack',
    'cutscenePlaying',
    'cameraNeedsReorientation',
    'draggables',
    'failedTransactions',
    'lotLoader',
    'timeOverride'  // should this be in ClockContext?
  ]
})));

export default useStore;
