const settingsStore = (set, get) => ({
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
      active: true,
      expanded: true
    },
    asteroid: {
      active: false,
      expanded: true
    },
    ownedAsteroids: {
      active: false,
      expanded: true
    },
    watchlist: {
      active: false,
      expanded: true
    },
    routePlanner: {
      active: false,
      expanded: true
    },
    timeControl: {
      active: false,
      expanded: true
    }
  },

  setOutlinerSectionActive: (section, active = true) => set(state => {
    const oldSections = get().outlinerSections;
    const newSection = {...oldSections[section], active: active };
    const newSections = {...oldSections, [section]: newSection };
    return { outlinerSections: newSections };
  }),

  setOutlinerSectionExpanded: (section, expanded = true) => set(state => {
    const oldSections = get().outlinerSections;
    const newSection = {...oldSections[section], expanded: expanded };
    const newSections = {...oldSections, [section]: newSection };
    return { outlinerSections: newSections };
  })
});

export default settingsStore;
