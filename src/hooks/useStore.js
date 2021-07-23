import create from 'zustand';
import { persist } from 'zustand/middleware'
import axios from 'axios';

const useStore = create(persist((set, get) => ({

  token: undefined,

  gettingToken: false,

  updateToken: (token) => set(state => {
    return { token: token };
  }),

  getToken: async (library, account) => {
    if (get().gettingToken) return;
    set({ gettingToken: true });

    try {
      const loginResponse = await axios.get(`${process.env.REACT_APP_API_URL}/v1/auth/login/${account}`);
      const message = loginResponse.data.message;
      const signed = await library.getSigner(account).signMessage(message);
      const verifyResponse = await axios.post(
        `${process.env.REACT_APP_API_URL}/v1/auth/login/${account}`,
        { sig: signed }
      );

      set({ token: verifyResponse.data.token });
    } catch (e) {
      console.error(e);
    } finally {
      set({ gettingToken: false });
    }
  },

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
})));

export default useStore;
