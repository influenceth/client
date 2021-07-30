import axios from 'axios';

const tokenStore = (set, get) => ({
  // Authentication / Bearer token (jwt)
  token: null,

  // Whether token handshakes / Ethereum signing are happening
  gettingToken: false,

  // Update the JWT in state
  updateToken: (token) => set(state => {
    return { token: token };
  }),

  // Fires off the handshakes required to request a token
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
  }
});

export default tokenStore;
