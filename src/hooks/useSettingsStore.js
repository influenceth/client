import create from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(persist((set, get) => ({
  // Whether the right pane is pinned open
  outliinerPinned: false,

  // Updates the current time for time controls
  setOutlinerPinned: (pinned) => set(state => {
    return { outlinerPinned: pinned };
  })
})));

export default useSettingsStore;
