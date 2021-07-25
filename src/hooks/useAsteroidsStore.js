import create from 'zustand';
import { persist } from 'zustand/middleware';

const useAsteroidsStore = create(persist((set, get) => ({
  // Currently selected asteroid Id, doubles as the origin for flight planning
  origin: 1,

  // Updates the origin to a new asteroid Id
  updateOrigin: (newOrigin) => set(state => {
    return { origin: newOrigin };
  }),

  // Currently selected destination asteroid Id for flight planning
  destination: 2,

  // Updates the destination to a new asteroid Id
  updateDestination: (newDest) => set(state => {
    return { destination: newDest };
  })
})));

export default useAsteroidsStore;
