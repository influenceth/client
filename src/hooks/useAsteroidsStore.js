import create from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const useAsteroidsStore = create(persist((set, get) => ({
  // Currently selected asteroid Id, doubles as the origin for flight planning
  origin: null,

  // Updates the origin to a new asteroid
  selectOrigin: async (newOrigin) => {
    if (newOrigin === get().destination?.i) {
      set({ destination: null });
    }

    try {
      const asteroid = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids/${newOrigin}`);
      set({ origin: asteroid.data });
    } catch (e) {
      console.error(e);
    }
  },

  deselectOrigin: () => set(state => {
    return { origin: null };
  }),

  // Currently selected destination asteroid Id for flight planning
  destination: null,

  // Updates the destination to a new asteroid
  selectDestination: async (newDest) => {
    if (newDest === get().origin?.i) {
      set({ origin: null });
    }

    try {
      const asteroid = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids/${newDest}`);
      set({ destination: asteroid.data });
    } catch (e) {
      console.error(e);
    }
  },

  deselectDestination: () => set(state => {
    return { destination: null };
  }),

  // Whether to include owned asteroids in the map result set
  includeOwned: null,

  setIncludeOwned: (includeOwned) => set(state => {
    return { includeOwned: includeOwned };
  }),

  hoveredAsteroid: null,

  setHoveredAsteroid: (i) => set(state => {
    return { hoveredAsteroid: i };
  })
})));

export default useAsteroidsStore;
