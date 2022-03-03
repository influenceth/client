import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';
import { START_TIMESTAMP } from 'influence-utils';

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
      requestingModelDownload: false
    },

    auth: {
      token: null
    },

    logs: {
      alerts: []
    },

    time: {
      precise: ((Date.now() / 1000) - START_TIMESTAMP) / 3600,
      current: ((Date.now() / 1000) - START_TIMESTAMP) / 3600,
      autoUpdating: true
    },

    outliner: {
      pinned: true,
      ...outlinerSectionDefaults
    },

    graphics: {
      lensflare: true,
      skybox: true,
      shadowMode: 1,
      shadowSize: 1024,
      textureSize: 512,
      fov: 75
    },

    sounds: {
      music: 100,
      effects: 100,
      toPlay: null
    },

    sale: false,

    referrer: null,

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

    dispatchTextureSizeSet: (size) => set(produce(state => {
      state.graphics.textureSize = size;
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

    dispatchShadowModeSet: (mode) => set(produce(state => {
      state.graphics.shadowMode = mode; // 0 is off, 1 is standard, 2 is CSM
    })),

    dispatchShadowSizeSet: (size) => set(produce(state => {
      state.graphics.shadowSize = size;
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
    })),

    dispatchOriginCleared: () => set(produce(state => {
      state.asteroids.origin = null;
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

    dispatchTimeUpdated: (time) => set(produce(state => {
      // default time to current time
      const useTime = time || ((Date.now() / 1000) - START_TIMESTAMP) / 3600;

      // "precise" time for zoomed-in elements
      state.time.precise = useTime;

      // "current" time for zoomed-out elements (more granular)
      const incrHours = 10 / 3600;
      state.time.current = Math.round(useTime / incrHours) * incrHours;
    })),

    dispatchTimeControlled: () => set(produce(state => {
      state.time.autoUpdating = false;
    })),

    dispatchTimeUncontrolled: () => set(produce(state => {
      state.time.autoUpdating = true;
    })),

    dispatchAuthenticated: (token) => set(produce(state => {
      state.auth.token = token;
    })),

    dispatchTokenInvalidated: () => set(produce(state => {
      state.auth.token = null;
    })),

    dispatchReferrerSet: (refCode) => set(produce(state => {
      state.referrer = refCode;
    })),

    dispatchModelDownloadRequested: () => set(produce(state => {
      state.asteroids.requestingModelDownload = true;
    })),

    dispatchModelDownloadComplete: () => set(produce(state => {
      state.asteroids.requestingModelDownload = false;
    }))
}), {
  name: 'influence',
  version: 0,
  blacklist: [ 'time' ]
}));

export default useStore;
