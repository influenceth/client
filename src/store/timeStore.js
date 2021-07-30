import { START_TIMESTAMP } from 'influence-utils';

const timeStore = (set, get) => ({
  // Adalian time in days elapsed since founding
  time: 0,

  // Whether the time is auto-updating
  autoUpdatingTime: true,

  // Updates the current time for time controls
  updateTime: (time) => set(state => {
    return { time: time };
  }),

  // Updates to the current Adalia time
  updateToCurrentTime: () => set(state => {
    if (get().autoUpdatingTime) {
      return { time: ((Date.now() / 1000) - START_TIMESTAMP) / 3600 }
    }
  }),

  // Pause auto-updates of Adalia time
  updateAutoUpdatingTime: (updating) => set(state => {
    return { autoUpdatingTime: updating };
  })
});

export default timeStore;
