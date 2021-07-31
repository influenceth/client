const saleStore = (set, get) => ({
  // Adalian time in days elapsed since founding
  saleStart: 0,

  // Whether the time is auto-updating
  updateSaleStart: (start) => set(state => {
    return { saleStart: start };
  }),

  activeSale: () => {
    return (Date.now() / 1000) > get().saleStart;
  }
});

export default timeStore;
