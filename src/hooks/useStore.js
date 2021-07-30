import create from 'zustand';
import { persist } from 'zustand/middleware';

import asteroidsStore from '~/store/asteroidsStore';
import settingsStore from '~/store/settingsStore';
import timeStore from '~/store/timeStore';
import tokenStore from '~/store/tokenStore';

const useStore = create(persist((set, get) => ({
    ...asteroidsStore(set, get),
    ...settingsStore(set, get),
    ...timeStore(set, get),
    ...tokenStore(set, get)
})));

export default useStore;
