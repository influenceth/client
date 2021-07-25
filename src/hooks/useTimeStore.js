import create from 'zustand';

const useTimeStore = create((set, get) => ({
  // Adalian time in days elapsed since founding
  time: 0,

  // Whether the time is auto-updating
  autoUpdatingTime: true,

  // Updates the current time for time controls
  updateTime: (time) => set(state => {
    return { time: time };
  }),

  // Pause auto-updates of Adalia time
  updateAutoUpdatingTime: (updating) => set(state => {
    return { autoUpdatingTime: updating };
  })
}));

export default useTimeStore;
