import axios from 'axios';
import { Asteroid } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';

// pass initial config to axios
const config = { baseURL: process.env.REACT_APP_API_URL, headers: {} };
const initialToken = useStore.getState().auth.token;
if (initialToken) config.headers = { Authorization: `Bearer ${initialToken}`};
const initialCrew = useStore.getState().selectedCrewId;
if (initialCrew) config.headers['X-Crew-Id'] = initialCrew;
const instance = axios.create(config);

// subscribe to changes relevant to the config
useStore.subscribe(
  s => [s.auth.token, s.selectedCrewId],
  ([newToken, crewId]) => {
    instance.defaults.headers = {
      Authorization: `Bearer ${newToken}`,
      'X-Crew-Id': crewId
    };
  }
);

const buildQuery = (queryObj) => {
  return Object.keys(queryObj || {}).map((key) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(queryObj[key])}`;
  }).join('&');
};

const api = {
  getUser: async () => {
    const response = await instance.get('/v1/user');
    return response.data;
  },

  getCrewActionItems: async () => {
    const response = await instance.get('/v1/user/actionitems');
    return response.data;
  },

  getCrewPlannedLots: async () => {
    const response = await instance.get('/v1/user/plans');
    return response.data;
  },

  getUserAssignments: async () => {
    const response = await instance.get('/v1/user/assignments');
    return response.data;
  },

  getEvents: async (query) => {
    const response = await instance.get(`/v1/user/events${query ? `?${buildQuery(query)}` : ''}`);
    return {
      events: response.data,
      totalHits: query.returnTotal ? parseInt(response.headers['total-hits']) : undefined,
      blockNumber: parseInt(response.headers['starknet-block-number']),
      // ethBlockNumber: parseInt(response.headers['eth-block-number'])  // NOTE: probably not needed anymore
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

  getAsteroid: async (i, extended = false) => {
    const response = await instance.get(`/v1/asteroids/${i}${extended ? '?extended=1' : ''}`);
    return response.data;
  },

  getAsteroids: async (query) => {
    const response = await instance.get('/v1/asteroids', { params: query });
    return response.data;
  },

  getAsteroidLotData: async (i) => {
    const response = await instance.get(`/v1/asteroids/${i}/lots/packed`, { responseType: 'blob' });

    const lotTally = Asteroid.getSurfaceArea(i);

    let shift;
    const mask = 0b11111111;

    // TODO (enhancement?): any benefit to returning a sparse array here instead?
    // (probably yes unless going to send as a buffer to worker as part of a performance enhancement)
    if (response.data) {
      return (new Uint32Array(await response.data.arrayBuffer())).reduce((acc, byte, i) => {
        for (let j = 0; j < 4; j++) {
          const index = i * 4 + j;
          if (index < lotTally) {
            // shift right 24, 16, 8, then 0
            shift = (3 - j) * 8;

            // (adjust for one-index of lot ids)
            acc[index + 1] = (Number(byte) >> shift) & mask;
          }
        }
        return acc;
      }, [0]);
    }
    return null;
  },

  getCrewOccupiedLots: async (a, c) => {
    const response = await instance.get(`/v1/asteroids/${a}/lots/occupier/${c}`);
    return response.data;
  },

  getCrewSampledLots: async (a, c, r) => {
    const response = await instance.get(`/v1/asteroids/${a}/lots/sampled/${c}/${r}`);
    return response.data;
  },

  getLot: async (asteroidId, lotId) => {
    const response = await instance.get(`/v1/asteroids/${asteroidId}/lots/${lotId}`);
    return response.data;
  },

  getOwnedAsteroidsCount: async () => {
    const response = await instance.get('/v1/asteroids/ownedCount');
    return response.data;
  },

  getOwnedCrews: async () => {
    const response = await instance.get(`/v1/crews/owned`);
    return response.data;
  },

  getCrew: async (i) => {
    const response = await instance.get(`/v1/crews/${i}`);
    return response.data;
  },

  getCrewMember: async (i) => {
    const response = await instance.get(`/v1/crewmates/${i}`);
    return response.data;
  },

  getOwnedCrewMembers: async () => {
    const response = await instance.get('/v1/crewmates/owned');
    return response.data;
  },

  getCrewMembers: async (query) => {
    const response = await instance.get('/v1/crewmates', { params: query });
    return response.data;
  },

  getMintableCrew: async (query) => {
    const response = await instance.get('/v1/crewmates/mintable', { params: query });
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

  searchAssets: async (asset, query) => {
    const response = await instance.post(`/_search/${asset.replace(/s$/, '').toLowerCase()}`, query);
    return {
      hits: response.data.hits.hits.map((h) => h._source),
      total: response.data.hits.total.value
    }
  },

  searchLots: async (query) => {
    const response = await instance.get(`/lots/_search`, { params: query });
    return response.data;
  },

  requestLogin: async (account) => {
    const response = await instance.get(`/v1/auth/login/${account}`);
    return response.data.message;
  },

  verifyLogin: async (account, params) => {
    const response = await instance.post(`/v1/auth/login/${account}`, params);
    return response.data.token;
  },

  createDevnetBlock: async () => {
    try {
      axios.post(`${process.env.REACT_APP_STARKNET_NETWORK}/create_block`, {});
    } catch (e) {
      console.warn(e);
    }
  }
};

export default api;
