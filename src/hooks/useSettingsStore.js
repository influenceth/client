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
  }),

  outlinerSections: {
    wallet: {
      visible: true,
      expanded: true
    },
    ownedAsteroids: {
      visible: true,
      expanded: false
    },
    watchlist: {
      visible: true,
      expanded: false
    },
    routePlanner: {
      visible: false,
      expanded: true
    },
    timeControl: {
      visible: false,
      expanded: true
    }
  },

  setOutlinerSectionVisible: (section, visible = true) => set(state => {
    const oldSections = get().outlinerSections;
    const newSection = {...oldSections[section], visible: visible };
    const newSections = {...oldSections, [section]: newSection };
    return { outlinerSections: newSections };
  }),

  setOutlinerSectionExpanded: (section, expanded = true) => set(state => {
    const oldSections = get().outlinerSections;
    const newSection = {...oldSections[section], expanded: expanded };
    const newSections = {...oldSections, [section]: newSection };
    return { outlinerSections: newSections };
  })
})));

export default useSettingsStore;
