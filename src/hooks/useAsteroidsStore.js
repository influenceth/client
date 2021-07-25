import create from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const useAsteroidsStore = create(persist((set, get) => ({
  // Currently selected asteroid Id, doubles as the origin for flight planning
  origin: null,

  // Updates the origin to a new asteroid
  selectOrigin: async (newOrigin) => {
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
    try {
      const asteroid = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids/${newDest}`);
      set({ destination: asteroid.data });
    } catch (e) {
      console.error(e);
    }
  },

  deselectDestination: () => set(state => {
    return { destination: null };
  })
})));

export default useAsteroidsStore;
