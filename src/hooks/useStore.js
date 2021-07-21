import create from 'zustand';

const useStore = create(set => ({
  adaliaTime: 0,
  updateAdaliaTime: (time) => set(state => ({ adaliaTime: time }))
}));

export default useStore;
