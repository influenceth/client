import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';
import { START_TIMESTAMP } from 'influence-utils';

import asteroidsStore from '~/store/asteroidsStore';
import settingsStore from '~/store/settingsStore';

const useStore = create(persist((set, get) => ({
    ...asteroidsStore(set, get),

    auth: {
      token: null
    },

    time: {
      current: ((Date.now() / 1000) - START_TIMESTAMP) / 3600,
      autoUpdating: true
    },

    ...settingsStore(set, get),

    dispatchOriginSelected: (i) => set(produce(state => {
      state.asteroids.origin = i;
    })),

    dispatchOriginCleared: (i) => set(produce(state => {
      state.asteroids.origin = null;
    })),

    dispatchDestinationSelected: (i) => set(produce(state => {
      state.asteroids.destination = i;
    })),

    dispatchDestinationCleared: (i) => set(produce(state => {
      state.asteroids.destination = null;
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
