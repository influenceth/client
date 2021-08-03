import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';
import { START_TIMESTAMP } from 'influence-utils';

const useStore = create(persist((set, get) => ({
    asteroids: {
      origin: null,
      destination: null,
      hovered: null,
      filters: {},
      highlight: null,
      owned: {
        mapped: false,
        filtered: false,
        highlighted: false
      },
      watched: {
        mapped: false,
        filtered: false,
        highlighted: false
      }
    },

    auth: {
      token: null
    },

    time: {
      current: ((Date.now() / 1000) - START_TIMESTAMP) / 3600,
      autoUpdating: true
    },

    outliner: {
      pinned: true,
      wallet: { active: true, expanded: true },
      selectedAsteroid: { active: false, expanded: true },
      filters: { active: false, expanded: true },
      ownedAsteroids: { active: false, expanded: true },
      ownedCrew: { active: false, expanded: true },
      watchlist: { active: false, expanded: true },
      routePlanner: { active: false, expanded: true },
      timeControl: { active: false, expanded: true }
    },

    graphics: {
      skybox: true
    },

    dispatchOutlinerPinned: () => set(produce(state => {
      state.outliner.pinned = true;
    })),

    dispatchOutlinerUnpinned: () => set(produce(state => {
      state.outliner.pinned = false;
    })),

    dispatchOutlinerSectionActivated: (section) => set(produce(state => {
      state.outliner[section].active = true;
      state.outliner.pinned = true;
    })),

    dispatchOutlinerSectionDeactivated: (section) => set(produce(state => {
      state.outliner[section].active = false;
    })),

    dispatchOutlinerSectionExpanded: (section) => set(produce(state => {
      state.outliner[section].expanded = true;
    })),

    dispatchOutlinerSectionCollapsed: (section) => set(produce(state => {
      state.outliner[section].expanded = false;
    })),

    dispatchSkyboxHidden: () => set(produce(state => {
      state.graphics.skybox = false;
    })),

    dispatchSkyboxUnhidden: () => set(produce(state => {
      state.graphics.skybox = true;
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
  blacklist: [ 'time' ]
}));

export default useStore;
