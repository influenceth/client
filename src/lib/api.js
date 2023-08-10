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

const getEntityById = async ({ label, i, components }) => {
  const query = { label };
  query.id = Array.isArray(i) ? i.join(',') : i;
  if (components) {
    query.components = components.join(',');  // i.e. [ 'celestial', 'control' ]
  }

  const response = await instance.get(`/v1/entities/id?${buildQuery(query)}`);
  return response.data;
};

const getEntities = async ({ match, label, components }) => {
  const query = {};
  if (match) {
    // i.e. { 'Celestial.celestialType': 2 }
    // i.e. { 'Location.location': { label: 'Lot', id: 123 } }
    query.match = `${Object.keys(match)[0]}:${JSON.stringify(Object.values(match)[0])}`;
  }
  if (label) {
    query.label = label;  // i.e. 'asteroid'
  }
  if (components) {
    query.components = components.join(',');  // i.e. [ 'celestial', 'control' ]
  }
  
  const response = await instance.get(`/v1/entities?${buildQuery(query)}`);
  return response.data;
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

  getCrewPlannedBuildings: async () => {
    const response = await instance.get('/v1/user/plans');  // TODO: server-side update
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
    const response = await instance.get('/v1/user/watchlist'); // TODO: server-side update
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

  getAsteroid: async (i) => { //, extended = false) => {
    // TODO: deprecate `extended` OR need to pass extra queryString to getEntityById OR need a separate call for that data
    // const response = await instance.get(`/v1/asteroids/${i}${extended ? '?extended=1' : ''}`);
    return getEntityById({ label: 'Asteroid', i });
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

  getAsteroidShips: async (i) => {
    // TODO: use elasticsearch so can search by flattened location
    return [];
  },

  // TODO: ecs refactor -- probably better to use a single resolve location endpoint
  getBuilding: async (i) => {
    return getEntityById({ label: 'Building', i });
  },

  getCrewOccupiedLots: async (a, c) => {
    // TODO: elasticsearch
    const response = await instance.get(`/v1/asteroids/${a}/lots/occupier/${c}`);
    return response.data;
    // return getEntities({
    //   match: { 'control.controller': c },
    //   label: 'building'
    // });
  },

  getCrewSampledLots: async (a, c, r) => {
    // TODO: elasticsearch
    const response = await instance.get(`/v1/asteroids/${a}/lots/sampled/${c}/${r}`);
    return response.data;
  },

  getCrewShips: async (c) => {
    return getEntities({
      match: { 'Control.controller.id': c },
      label: 'Ship'
    })
  },

  getEntityById,

  getEntities,

  getLot: async (asteroidId, lotId) => {
    // TODO: make sure the response matches
    // const response = await instance.get(`/v1/asteroids/${asteroidId}/lots/${lotId}`);
    return getEntityById({ label: 'Lot', i: lotId });
  },

  getNameUse: async (label, name) => {
    return getEntities({ match: { name }, label, components: [] });
  },

  getOwnedAsteroids: async (account) => {
    return getEntities({ match: { 'Nft.owner': account }, label: 'Asteroid' });
  },

  // TODO: deprecate this (and just use .length of getOwnedAsteroids()?)
  getOwnedAsteroidsCount: async () => {
    const response = await instance.get('/v1/asteroids/ownedCount');
    return response.data;
  },

  getOwnedCrews: async (account) => {
    return getEntities({ match: { 'Crew.delegatedTo': account }, label: 'Crew' });
  },

  getCrewmatesByCrewIds: async (crewIds) => {
    console.log('pmk zz', crewIds);
    return getEntities({
      match: { 'Control.controller': crewIds.map((i) => ({ label: 'Crewmate', id: i })) },
      label: 'Crewmate'
    });
  },

  getCrew: async (i) => {
    return getEntityById({ label: 'Crew', i });
  },

  getCrewmate: async (i) => {
    return getEntityById({ label: 'Crewmate', i });
  },

  getCrewmates: async (ids) => {
    return getEntityById({ label: 'Crewmate', i: ids });
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

  getShip: async (i) => {
    return getEntityById({ label: 'Ship', i });
  },

  getShipCrews: async (shipId) => {
    return getEntities({
      match: { 'Location.location': Location.toEntityFormat({ shipId }) },
      label: 'Crew'
    });
  },

  getBook: async (id) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/v1/books/${id}`);
    return response.data;
  },

  getStory: async (id, sessionId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/v1/stories/${id}`, { params: { session: sessionId }});
    return response.data;
  },

  createStorySession: async (crewmate, story) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.post(`/v1/stories/sessions`, { crewmate, story });
    return response.data;
  },

  getStorySession: async (id) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/v1/stories/sessions/${id}`);
    return response.data;
  },

  getStoryPath: async (storyId, pathId, sessionId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(
      `/v1/stories/${storyId}/paths/${pathId}`,
      { params: { session: sessionId } }
    );
    return response.data;
  },

  patchStorySessionPath: async (sessionId, pathId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.patch(`/v1/stories/sessions/${sessionId}/paths/${pathId}`);
    return response.data;
  },

  deleteStorySessionPath: async (sessionId, pathId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.delete(`/v1/stories/sessions/${sessionId}/paths/${pathId}`);
    return response.data;
  },

  getAdalianRecruitmentStory: async (id, sessionId) => {
    return null;  // TODO: restore this when story is ready again
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

  requestLogin: async (account) => {
    const response = await instance.get(`/v1/auth/login/${account}`);
    return response.data.message;
  },

  verifyLogin: async (account, params) => {
    const response = await instance.post(`/v1/auth/login/${account}`, params);
    return response.data.token;
  },

  createDevnetBlock: async () => {
    return;
    try {
      axios.post(`${process.env.REACT_APP_STARKNET_NETWORK}/create_block`, {});
    } catch (e) {
      console.warn(e);
    }
  }
};

export default api;
