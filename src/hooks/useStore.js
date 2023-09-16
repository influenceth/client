import create from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import produce from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { Building } from '@influenceth/sdk';

import constants from '~/lib/constants';

const {
  CHUNK_RESOLUTION,
  GRAPHICS_DEFAULTS,
  ENABLE_SHADOWS,
  MIN_FOV,
  MAX_FOV
} = constants;

const buildingIds = Object.values(Building.IDS).filter((k) => k > 0).map((k) => k.toString());

const assetSearchDefaults = {
  actionitems: { filters: {}, sort: ['time', 'asc'] },
  asteroids: { filters: {}, sort: ['Celestial.radius', 'desc'] },
  asteroidsMapped: { filters: {}, sort: ['Celestial.radius', 'desc'], highlight: null },
  buildings: { filters: {}, sort: ['Building.buildingType', 'asc'] },
  coresamples: { filters: { status: [2,3] }, sort: ['lot.id', 'asc'] },
  crewmates: { filters: {}, sort: ['id', 'asc'] },
  crews: { filters: {}, sort: ['id', 'asc'] },
  eventlog: { filters: {}, sort: ['time', 'desc'] },
  ships: { filters: {}, sort: ['id', 'asc'] },
  orders: { filters: {}, sort: ['id', 'asc'] },
  leases: { filters: {}, sort: ['lot.id', 'asc'] },
  lots: { filters: {}, sort: ['id', 'asc'] },
  lotsMapped: { filters: { type: [...buildingIds] }, sort: ['id', 'asc'], highlight: null },
};

const useStore = create(subscribeWithSelector(persist((set, get) => ({
    actionDialog: {},
    launcherPage: null,
    openHudMenu: null,

    asteroids: {
      origin: null,
      destination: null,
      hovered: null,
      lot: null,
      lotDestination: null,
      resourceMap: {
        active: false,
        selected: null
      },
      travelMode: false,
      travelSolution: null,
      zoomedFrom: null,
      zoomScene: null,
      zoomStatus: 'out', // out -> zooming-in -> in -> zooming-out -> out
      // owned: {
      //   highlighted: false,
      //   highlightColor: '#AB149E'
      // },
      // watched: {
      //   highlighted: false,
      //   highlightColor: '#AB149E'
      // },
    },

    assetSearch: {
      ...assetSearchDefaults
    },
    lotsMappedAssetSearchResults: {},

    auth: {
      loggingIn: false,
      token: null
    },

    selectedCrewId: null,
    crewAssignments: {},

    cameraNeedsReorientation: false,

    hasSeenIntroVideo: false,
    cutscenePlaying: false,
    canvasStack: [],

    logs: {
      alerts: []
    },

    timeOverride: null,

    draggables: {},

    graphics: {
      autodetect: true,
      fov: 75,
      lensflare: true,
      pixelRatio: 1,
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
      music: process.env.NODE_ENV === 'development' ? 0 : 100,
      effects: process.env.NODE_ENV === 'development' ? 0 : 100,
      toPlay: null
    },

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

    dispatchGraphicsAutodetectSet: (which, gpuInfo) => set(produce(state => {
      state.graphics.autodetect = which;
      if (state.graphics.autodetect) {
        const defaults = GRAPHICS_DEFAULTS[gpuInfo.tier] || {};
        Object.keys(defaults).forEach((k) => {
          state.graphics[k] = defaults[k];
        });
      }
    })),

    dispatchToggleInterface: (force) => set(produce(state => {
      state.graphics.hideInterface = (force === true || force === false)
        ? force
        : !state.graphics.hideInterface;
    })),

    dispatchToggleDevTools: (force) => set(produce(state => {
      state.graphics.showDevTools = (force === true || force === false)
        ? force
        : !state.graphics.showDevTools;
      if (state.graphics.showDevTools && state.openHudMenu !== 'DEV_TOOLS') {
        state.openHudMenu = 'DEV_TOOLS';
      } else if (!state.graphics.showDevTools && state.openHudMenu === 'DEV_TOOLS') {
        state.openHudMenu = null;
      }
    })),

    dispatchPixelRatio: (ratio) => set(produce(state => {
      state.graphics.pixelRatio = ratio;
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
      state.asteroids.travelSolution = null;
      state.asteroids.zoomScene = null;
    })),

    dispatchDestinationSelected: (i) => set(produce(state => {
      state.asteroids.destination = null;
      if (i && Number(i) > 0 && Number(i) <= 250000) {
        state.asteroids.destination = Number(i);
      }
      state.asteroids.travelSolution = null;
    })),

    dispatchTravelMode: (which) => set(produce((state => {
      state.asteroids.travelMode = which;
      if (!which) {
        state.asteroids.travelSolution = null;
      }
    }))),

    dispatchTravelSolution: (solution) => set(produce((state => {
      state.asteroids.travelSolution = solution;
    }))),

    dispatchSwapOriginDestination: () => set(produce((state => {
      if (state.asteroids.origin && state.asteroids.destination) {
        const tmp = state.asteroids.origin;
        state.asteroids.origin = state.asteroids.destination;
        state.asteroids.destination = tmp;
        state.asteroids.travelSolution = null;
      }
    }))),

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
        state.asteroids.zoomScene = null;
      }
    })),

    dispatchAsteroidZoomedFrom: (from) => set(produce(state => {
      state.asteroids.zoomedFrom = from;
    })),

    dispatchFiltersUpdated: (assetType) => (filters) => set(produce(state => {
      state.assetSearch[assetType].filters = filters;
    })),

    dispatchFilterReset: (assetType, fieldName) => set(produce(state => {
      if (assetSearchDefaults[assetType].filters[fieldName]) {
        state.assetSearch[assetType].filters[fieldName] = cloneDeep(assetSearchDefaults[assetType].filters[fieldName]);
      } else {
        delete state.assetSearch[assetType].filters[fieldName];
      }
    })),

    dispatchFiltersReset: (assetType) => () => set(produce(state => {
      state.assetSearch[assetType].filters = { ...assetSearchDefaults[assetType].filters };
      state.assetSearch[assetType].sort = [ ...assetSearchDefaults[assetType].sort ];
      if (Object.keys(assetSearchDefaults[assetType]).includes('highlight')) {
        state.assetSearch[assetType].highlight = assetSearchDefaults[assetType].highlight
          ? { ...assetSearchDefaults[assetType].highlight }
          : null;
      }
    })),

    dispatchSortUpdated: (assetType) => (sort) => set(produce(state => {
      state.assetSearch[assetType].sort = sort;
    })),

    dispatchHighlightUpdated: (assetType) => (settings) => set(produce(state => {
      state.assetSearch[assetType].highlight = settings || null;
    })),

    dispatchLotsMappedSearchResults: (payload) => set(produce(state => {
      state.lotsMappedAssetSearchResults = { ...payload };
    })),

    dispatchCrewAssignmentPathSelection: (crewId, crewmateId, bookId, storyId, pathId) => set(produce(state => {
      const crewKey = `${crewId}_${crewmateId}`;
      if (!state.crewAssignments) state.crewAssignments = {};
      if (!state.crewAssignments[crewKey]) state.crewAssignments[crewKey] = {};
      if (!state.crewAssignments[crewKey][bookId]) state.crewAssignments[crewKey][bookId] = {};
      if (!state.crewAssignments[crewKey][bookId][storyId]) state.crewAssignments[crewKey][bookId][storyId] = [];
      if (!state.crewAssignments[crewKey][bookId][storyId].includes(pathId)) {
        state.crewAssignments[crewKey][bookId][storyId].push(pathId);
      }
    })),

    dispatchCrewAssignmentPathUndo: (crewId, crewmateId, bookId, storyId) => set(produce(state => {
      const crewKey = `${crewId}_${crewmateId}`;
      if (state.crewAssignments?.[crewKey]?.[bookId]?.[storyId]?.length > 0) {
        state.crewAssignments[crewKey][bookId][storyId].pop();
      }
    })),

    dispatchCrewAssignmentRestart: (crewId, crewmateId, bookId) => set(produce(state => {
      const crewKey = `${crewId}_${crewmateId}`;
      state.crewAssignments[crewKey][bookId] = {};
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

    // dispatchOwnedAsteroidColorChange: (color) => set(produce(state => {
    //   state.asteroids.owned.highlightColor = color;
    // })),

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

    // dispatchWatchedAsteroidColorChange: (color) => set(produce(state => {
    //   state.asteroids.watched.highlightColor = color;
    // })),

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
      state.asteroids.zoomScene = null;
    })),

    dispatchReorientCamera: (needsReorienting) => set(produce(state => {
      state.cameraNeedsReorientation = !!needsReorienting;
    })),

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

    dispatchZoomScene: (details) => set(produce(state => {
      state.asteroids.zoomScene = details || null;
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

    isAssetSearchMatchingDefault: (assetType) => {
      if (!assetType) return true;
      return isEqual(get().assetSearch[assetType].filters, assetSearchDefaults[assetType].filters)
        && isEqual(get().assetSearch[assetType].sort, assetSearchDefaults[assetType].sort)
    },

    isAssetSearchFilterMatchingDefault: (assetType, fieldName) => {
      if (!assetType || !fieldName) return true;
      return isEqual(get().assetSearch[assetType].filters[fieldName], assetSearchDefaults[assetType].filters[fieldName]);
    },

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
    'asteroids.travelMode',
    'asteroids.travelSolution',
    'asteroids.zoomScene',
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
