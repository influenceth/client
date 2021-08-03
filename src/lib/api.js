import axios from 'axios';

import useStore from '~/hooks/useStore';

const initialToken = useStore.getState().auth.token;
const config = { baseURL: process.env.REACT_APP_API_URL };
if (initialToken) config.headers = { Authorization: `Bearer ${initialToken}`};
const instance = axios.create(config);

useStore.subscribe(newToken => {
  instance.defaults.headers = { Authorization: `Bearer ${newToken}`}
}, state => state.auth.token);

const api = {

  getUser: async (token) => {
    const response = await instance.get('/v1/user');
    return response.data;
  },

  getWatchlist: async () => {
    const response = await instance.get('/v1/user/watchlist');
    return response.data;
  },

  watchAsteroid: async (i) => {
    const response = await instance.post(`/v1/user/watchlist/${i}`);
    return response.data;
  },

  unWatchAsteroid: async (i) => {
    const response = await instance.delete(`/v1/user/watchlist/${i}`);
    return response.data;
  },

  getAsteroid: async (i) => {
    const response = await instance.get(`/v1/asteroids/${i}`);
    return response.data;
  },

  getAsteroids: async (query) => {
    const response = await instance.get('/v1/asteroids', { params: query });
    return response.data;
  },

  getPlanets: async () => {
    const response = await instance.get('/v1/planets');
    return response.data;
  },

  getSale: async () => {
    const response = await instance.get('/v1/sales');
    return response.data[0];
  },

  requestLogin: async (account) => {
    const response = await instance.get(`/v1/auth/login/${account}`);
    return response.data.message;
  },

  verifyLogin: async (account, signature) => {
    const response = await instance.post(`/v1/auth/login/${account}`, { sig: signature });
    return response.data.token;
  }
};

export default api;
