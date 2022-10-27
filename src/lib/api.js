import axios from 'axios';

import useStore from '~/hooks/useStore';

const initialToken = useStore.getState().auth.token;
const config = { baseURL: process.env.REACT_APP_API_URL };
if (initialToken) config.headers = { Authorization: `Bearer ${initialToken}`};
const instance = axios.create(config);

useStore.subscribe(newToken => {
  instance.defaults.headers = { Authorization: `Bearer ${newToken}`}
}, s => s.auth.token);

const api = {
  getUser: async () => {
    const response = await instance.get('/v1/user');
    return response.data;
  },

  getUserAssignments: async () => {
    const response = await instance.get('/v1/user/assignments');
    return response.data;
  },

  getEvents: async (since) => {
    const response = await instance.get(`/v1/user/events?since=${since}`);
    return {
      events: response.data,
      blockNumber: parseInt(response.headers['eth-block-number'])
    };
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

  getReferralCount: async () => {
    const response = await instance.get('v1/user/referrals');
    return response.data;
  },

  createReferral: async (referral) => {
    if (!referral?.referrer) return null;
    const response = await instance.post(`/v1/user/referrals`, referral);
    return response.status;
  },

  getAssets: async (i) => {
    const response = await instance.get(`/v1/assets`);
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

  getOwnedAsteroidsCount: async () => {
    const response = await instance.get('/v1/asteroids/ownedCount');
    return response.data;
  },

  getCrewMember: async (i) => {
    const response = await instance.get(`/v1/crew/${i}`);
    return response.data;
  },

  getCrewMembers: async (query) => {
    const response = await instance.get('/v1/crew', { params: query });
    return response.data;
  },

  getMintableCrew: async (query) => {
    const response = await instance.get('/v1/crew/mintable', { params: query });
    return response.data;
  },

  getPlanets: async () => {
    const response = await instance.get('/v1/planets');
    return response.data;
  },

  getSale: async (assetType) => {
    const params = assetType ? { assetType } : {};
    const response = await instance.get('/v1/sales', { params });
    return response.data[0];
  },

  getBook: async (id) => {
    const response = await instance.get(`/v1/books/${id}`);
    return response.data;
  },

  getStory: async (id, sessionId) => {
    const response = await instance.get(`/v1/stories/${id}`, { params: { session: sessionId }});
    return response.data;
  },

  createStorySession: async (crewMember, story) => {
    const response = await instance.post(`/v1/stories/sessions`, { crewMember, story });
    return response.data;
  },

  getStorySession: async (id) => {
    const response = await instance.get(`/v1/stories/sessions/${id}`);
    return response.data;
  },

  getStoryPath: async (storyId, pathId, sessionId) => {
    const response = await instance.get(
      `/v1/stories/${storyId}/paths/${pathId}`,
      { params: { session: sessionId } }
    );
    return response.data;
  },

  patchStorySessionPath: async (sessionId, pathId) => {
    const response = await instance.patch(`/v1/stories/sessions/${sessionId}/paths/${pathId}`);
    return response.data;
  },

  deleteStorySessionPath: async (sessionId, pathId) => {
    const response = await instance.delete(`/v1/stories/sessions/${sessionId}/paths/${pathId}`);
    return response.data;
  },

  getAdalianRecruitmentStory: async (id, sessionId) => {
    const response = await instance.get(`/v1/stories/adalian-recruitment`);
    return response.data;
  },

  requestLogin: async (account) => {
    const response = await instance.get(`/v1/auth/login/${account}`);
    return response.data.message;
  },

  verifyLogin: async (account, params) => {
    const response = await instance.post(`/v1/auth/login/${account}`, params);
    return response.data.token;
  }
};

export default api;
