import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';
import { START_TIMESTAMP } from 'influence-utils';

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
      }
    },

    auth: {
      token: null
    },

    logs: {
      alerts: []
    },

    time: {
      current: ((Date.now() / 1000) - START_TIMESTAMP) / 3600,
      autoUpdating: true
    },

    outliner: {
      pinned: true,
      wallet: { active: true, expanded: true },
      log: { active: true, expanded: true },
      filters: { active: true, expanded: true },
      selectedAsteroid: { active: false, expanded: true },
      ownedAsteroids: { active: false, expanded: true },
      ownedCrew: { active: false, expanded: true },
      watchlist: { active: false, expanded: true },
      routePlanner: { active: false, expanded: true },
      timeControl: { active: false, expanded: true }
    },

    graphics: {
      lensflare: true,
      skybox: true,
      shadows: true,
      shadowSize: 1024,
      textureSize: 512,
      fov: 75
    },

    sounds: {
      music: 100,
      effects: 100,
      toPlay: null
    },

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
      state.logs.alerts[index]['notified'] = true;
    })),

    dispatchAlertDismissed: (alert) => set(produce(state => {
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
      if (state.outliner[section]) state.outliner[section].active = true;
      state.outliner.pinned = true;
    })),

    dispatchOutlinerSectionDeactivated: (section) => set(produce(state => {
      if (state.outliner[section]) state.outliner[section].active = false;
    })),

    dispatchOutlinerSectionExpanded: (section) => set(produce(state => {
      if (state.outliner[section]) state.outliner[section].expanded = true;
    })),

    dispatchOutlinerSectionCollapsed: (section) => set(produce(state => {
      if (state.outliner[section]) state.outliner[section].expanded = false;
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

    dispatchShadowsOff: () => set(produce(state => {
      state.graphics.shadows = false;
    })),

    dispatchShadowsOn: () => set(produce(state => {
      state.graphics.shadows = true;
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
      state.asteroids.origin = i;
    })),

    dispatchOriginCleared: () => set(produce(state => {
      state.asteroids.origin = null;
    })),

    dispatchDestinationSelected: (i) => set(produce(state => {
      state.asteroids.destination = i;
    })),

    dispatchDestinationCleared: () => set(produce(state => {
      state.asteroids.destination = null;
    })),

    dispatchAsteroidHovered: (i) => set(produce(state => {
      state.asteroids.hovered = i;
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
      state.time.current = time;
    })),

    dispatchTimeControled: () => set(produce(state => {
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
    }))
}), {
  version: 0,
  blacklist: [ 'time' ]
}));

export default useStore;
