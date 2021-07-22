import create from 'zustand';
import { persist } from 'zustand/middleware'
import { isExpired, decodeToken } from 'react-jwt';
import axios from 'axios';

import { START_TIMESTAMP } from 'influence-utils';

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
  adaliaTime: 0,

  // Updates the current time for time controls
  updateAdaliaTime: (time) => set(state => {
    return { adaliaTime: time };
  }),

  // Resets the Adalian time to current
  resetAdaliaTime: () => set(state => {
    const time = ((Date.now() / 1000) - START_TIMESTAMP) / 3600;
    return { adaliaTime: time };
  })
})));

export default useStore;
