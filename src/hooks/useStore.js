import create from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import produce from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { Building, Lot } from '@influenceth/sdk';

import constants from '~/lib/constants';

export const STORE_NAME = 'influence';

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
  agreements: { filters: {}, sort: ['event.timestamp', 'asc'] },
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
    tutorialStep: -1,

    // scene: {
    //   belt: {
    //     origin, destination, hovered, travelMode, travelSolution, cameraPos/* (zoomedFrom) */,
    //   },
    //   asteroid: {
    //     origin, destination, hovered, resourceMap
    //   },
    //   lot: {
    //     model
    //   },
    //   zoomStatus: 'belt', // belt, zooming-in / zooming-out, asteroid, zooming-to-scene, lot
    //   transitionTo: {}
    // },

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
    },

    assetSearch: {
      ...assetSearchDefaults
    },
    lotsMappedAssetSearchResults: {},

    auth: {
      token: null
    },

    currentSession: {},
    sessions: {},

    selectedCrewId: null,
    crewAssignments: {},

    cameraNeedsRecenter: false,
    cameraNeedsReorientation: false,

    hasSeenIntroVideo: false,
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
      id: null,
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

    dispatchHasClickedPlay: () => set(produce(state => {
      state.tutorialStep = state.tutorialStep > 0 ? 0 : state.tutorialStep;
    })),

    dispatchLauncherPage: (page) => set(produce(state => {
      if (page === 'crews' || page === 'settings' || page === 'store') state.launcherPage = page;
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

    dispatchToggleInterface: (forceHide) => set(produce(state => {
      state.graphics.hideInterface = (forceHide === true || forceHide === false)
        ? forceHide
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

      // Allow changing destination to origin
      if (state.asteroids.destination === i) {
        state.asteroids.destination = null;
      }

      state.asteroids.lot = null;
      state.asteroids.lotDestination = null;
      state.asteroids.travelSolution = null;
      state.asteroids.zoomScene = null;
    })),

    dispatchDestinationSelected: (i) => set(produce(state => {
      if (state.asteroids.origin === i) return;

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

    dispatchCrewAssignmentPathSelection: (crewId, crewmateId, storyId, pathId) => set(produce(state => {
      const crewKey = `${crewId}_${crewmateId}`;
      if (!state.crewAssignments) state.crewAssignments = {};
      if (!state.crewAssignments[crewKey]) state.crewAssignments[crewKey] = {};
      if (!state.crewAssignments[crewKey][storyId]) state.crewAssignments[crewKey][storyId] = [];
      if (!state.crewAssignments[crewKey][storyId].includes(pathId)) {
        state.crewAssignments[crewKey][storyId].push(pathId);
      }
    })),

    dispatchCrewAssignmentPathUndo: (crewId, crewmateId, storyId) => set(produce(state => {
      const crewKey = `${crewId}_${crewmateId}`;
      if (state.crewAssignments?.[crewKey]?.[storyId]?.length > 0) {
        state.crewAssignments[crewKey][storyId].pop();
      }
    })),

    dispatchCrewAssignmentRestart: (crewId, crewmateId) => set(produce(state => {
      const crewKey = `${crewId}_${crewmateId}`;
      state.crewAssignments[crewKey] = {};
    })),

    dispatchTimeOverride: (anchor, speed) => set((produce(state => {
      state.timeOverride = anchor ? { anchor, speed, ts: Date.now() } : null;
    }))),

    // Starts a session and sets it as the current session
    dispatchSessionStarted: (session) => set(produce(state => {
      state.currentSession = session;
      state.sessions[session.accountAddress] = session;
    })),

    // Unsets the current session but keeps it in the sessions list
    dispatchSessionSuspended: () => set(produce(state => {
      state.currentSession = {};
    })),

    // Resumes a session that was suspended
    dispatchSessionResumed: (session) => set(produce(state => {
      state.currentSession = session;
    })),

    // Ends a session and removes it from the sessions list
    dispatchSessionEnded: () => set(produce(state => {
      delete state.sessions[state.currentSession?.accountAddress];
      state.currentSession = {};
      state.tutorialStep = -1;
    })),

    dispatchTutorialStep: (step) => set(produce(state => {
      state.tutorialStep = step;
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

    dispatchLotsLoading: (id, progress = 0, simulateTarget = 0) => set(produce(state => {
      if (simulateTarget) {
        state.lotLoader = { id, progress: state.lotLoader.progress + (simulateTarget - state.lotLoader.progress) / 3 };
      } else {
        state.lotLoader = { id, progress: progress > 0.99 ? 1 : progress };
      }
    })),

    dispatchLotSelected: (lotId) => set(produce(state => {
      state.asteroids.lot = lotId > 0 ? lotId : null;
      state.asteroids.zoomScene = null;
    })),

    dispatchRecenterCamera: (needsRecenter) => set(produce(state => {
      state.cameraNeedsRecenter = !!needsRecenter;
    })),

    dispatchReorientCamera: (needsReorienting) => set(produce(state => {
      state.cameraNeedsReorientation = !!needsReorienting;
    })),

    dispatchFailedTransaction: ({ key, vars = {}, meta = {}, txHash, err }) => set(produce(state => {
      if (!state.failedTransactions) state.failedTransactions = [];
      // because different wallets report tx failure in different ways, this is
      // prone to duplicates, so only report one failure per failed transaction
      if (!txHash || !state.failedTransactions.find((tx) => tx.txHash === txHash)) {
        state.failedTransactions.push({
          key,
          vars,
          meta,
          err,
          txHash,
          timestamp: Date.now()
        });
      }
    })),

    dispatchFailedTransactionDismissed: (txHashOrTimestamp) => set(produce(state => {
      if (!state.failedTransactions) state.failedTransactions = [];
      const bTxHashOrTimestamp = txHashOrTimestamp ? BigInt(txHashOrTimestamp) : null;
      state.failedTransactions = state.failedTransactions.filter((tx) => BigInt(tx.txHash || 0) !== bTxHashOrTimestamp && tx.timestamp !== txHashOrTimestamp);
    })),

    dispatchPendingTransaction: ({ key, vars = {}, meta = {}, timestamp, txHash }) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      state.pendingTransactions.push({
        key,
        vars,
        meta,
        txHash,
        timestamp: timestamp || Date.now() // 1695408166
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
  name: STORE_NAME,
  version: 4,
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
        if (version >= 3) return;
        if (state.asteroids.lot?.asteroidId && state.asteroids.lot?.lotId) {
          state.asteroids.lot = Lot.toId(state.asteroids.lot?.asteroidId, state.asteroids.lot?.lotId);
        } else {
          state.asteroids.lot = null;
        }
        return state;
      },
      (state, version) => {
        if (version >= 4) return;
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
    'cameraNeedsRecenter',
    'cameraNeedsReorientation',
    'cutscene',
    'draggables',
    // 'failedTransactions',
    'lotLoader',
    'timeOverride',  // should this be in ClockContext?
    'tutorialStep'
  ]
})));

export default useStore;
