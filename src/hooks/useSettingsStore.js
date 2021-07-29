import create from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(persist((set, get) => ({
  // Whether the right pane is pinned open
  outlinerPinned: false,

  // Updates the current time for time controls
  setOutlinerPinned: (pinned) => set(state => {
    return { outlinerPinned: pinned };
  }),

  // Whether the skybox is hiddent to ease finding asteroids
  skyboxHidden: false,

  // Set whether the skybox is hidden
  setSkyboxHidden: (hidden) => set(state => {
    return { skyboxHidden: hidden };
  })
})));

export default useSettingsStore;
