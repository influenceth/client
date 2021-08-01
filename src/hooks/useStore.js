import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';

import asteroidsStore from '~/store/asteroidsStore';
import authStore from '~/store/authStore';
import settingsStore from '~/store/settingsStore';
import timeStore from '~/store/timeStore';

const useStore = create(persist((set, get) => ({
    ...asteroidsStore(set, get),
    ...settingsStore(set, get),
    ...timeStore(set, get),
    auth: authStore(set),

    dispatchAuthenticated: (token) => set(produce(state => {
      state.auth.token = token;
    })),

    dispatchInvalidateToken: () => set(produce(state => {
      state.auth.token = null;
    }))
}), {
  blacklist: [ 'time' ]
}));

export default useStore;
