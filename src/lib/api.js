import axios from 'axios';
import { Asteroid, Entity } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';

// set default app version
const apiVersion = 'v2';

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

const backwardCompatibility = (entity) => {
  return { ...entity, i: entity.id }; // TODO: deprecate the `i` thing, remove this function
};

const getEntityById = async ({ label, id, components }) => {
  return getEntities({ label, ids: [id], components })[0];
};

const getEntities = async ({ ids, match, label, components }) => {
  const query = {};
  if (ids) {
    query.id = ids.join(',');
  } else if (match) {
    // i.e. { 'Celestial.celestialType': 2 }
    // i.e. { 'Location.location': { label: Entity.IDS.LOT, id: 123 } }
    query.match = `${Object.keys(match)[0]}:${JSON.stringify(Object.values(match)[0])}`;
  }
  if (label) {
    query.label = label;  // i.e. 'asteroid'
  }
  if (components) {
    query.components = components.join(',');  // i.e. [ 'celestial', 'control' ]
  }

  const response = await instance.get(`/${apiVersion}/entities?${buildQuery(query)}`);
  return (response.data || []).map(backwardCompatibility);
};

const api = {
  getUser: async () => {
    const response = await instance.get(`/${apiVersion}/user`);
    return response.data;
  },

  getCrewActionItems: async () => {
    const response = await instance.get(`/${apiVersion}/user/actionitems`);
    return response.data;
  },

  getCrewPlannedBuildings: async () => {
    const response = await instance.get(`/${apiVersion}/user/plans`);  // TODO: server-side update
    return response.data;
  },

  getCrewLocation: async (i) => {
    // TODO: ecs-refactor -- return a recursively flattened location object for crew id
    // (might be easiest to do from ES since already flattened)
    return {
      asteroidId: 1000,
      lotId: 1,
      buildingId: 1,
      shipId: null
    };
  },

  // TODO: will we want this for "random" story events
  // getUserAssignments: async () => {
  //   const response = await instance.get(`/${apiVersion}/user/assignments`);
  //   return response.data;
  // },

  getEvents: async (query) => {
    const response = await instance.get(`/v1${/* TODO: ? apiVersion */''}/user/events${query ? `?${buildQuery(query)}` : ''}`);
    return {
      events: response.data,
      totalHits: query.returnTotal ? parseInt(response.headers['total-hits']) : undefined,
      blockNumber: parseInt(response.headers['starknet-block-number']),
      // ethBlockNumber: parseInt(response.headers['eth-block-number'])  // NOTE: probably not needed anymore
    };
  },

  getWatchlist: async () => {
    const response = await instance.get(`/${apiVersion}/user/watchlist`); // TODO: server-side update
    return response.data;
  },

  watchAsteroid: async (i) => {
    const response = await instance.post(`/${apiVersion}/user/watchlist/${i}`);
    return response.data;
  },

  unWatchAsteroid: async (i) => {
    const response = await instance.delete(`/${apiVersion}/user/watchlist/${i}`);
    return response.data;
  },

  getReferralCount: async () => {
    const response = await instance.get(`/${apiVersion}/user/referrals`);
    return response.data;
  },

  createReferral: async (referral) => {
    if (!referral?.referrer) return null;
    const response = await instance.post(`/${apiVersion}/user/referrals`, referral);
    return response.status;
  },

  getAsteroid: async (i) => { //, extended = false) => {
    // TODO: deprecate `extended` OR need to pass extra queryString to getEntityById OR need a separate call for that data
    // const response = await instance.get(`/${apiVersion}/asteroids/${i}${extended ? '?extended=1' : ''}`);
    return getEntityById({ label: Entity.IDS.ASTEROID, id: i });
  },

  getAsteroidLotData: async (i) => {
    const response = await instance.get(`/${apiVersion}/asteroids/${i}/lots/packed`, { responseType: 'blob' });

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
    return getEntityById({ label: Entity.IDS.BUILDING, i });
  },

  getCrewOccupiedLots: async (a, c) => {
    // TODO: elasticsearch
    const response = await instance.get(`/${apiVersion}/asteroids/${a}/lots/occupier/${c}`);
    return response.data;
    // return getEntities({
    //   match: { 'control.controller': c },
    //   label: Entity.IDS.BUILDING
    // });
  },

  getCrewSampledLots: async (a, c, r) => {
    // TODO: elasticsearch
    const response = await instance.get(`/${apiVersion}/asteroids/${a}/lots/sampled/${c}/${r}`);
    return response.data;
  },

  getCrewShips: async (c) => {
    return getEntities({
      match: { 'Control.controller.id': c },
      label: Entity.IDS.SHIP
    })
  },

  getEntities,
  getEntityById,

  getLot: async (asteroidId, lotId) => {
    // TODO: make sure the response matches
    // const response = await instance.get(`/${apiVersion}/asteroids/${asteroidId}/lots/${lotId}`);
    return getEntityById({ label: Entity.IDS.LOT, id: lotId });
  },

  getNameUse: async (label, name) => {
    return getEntities({ match: { 'Name.name': name }, label, components: [] });
  },

  getOwnedAsteroids: async (account) => {
    return getEntities({ match: { 'Nft.owner': account }, label: Entity.IDS.ASTEROID });
  },

  getOwnedCrews: async (account) => {
    return getEntities({ match: { 'Crew.delegatedTo': account }, label: Entity.IDS.CREW });
  },

  getCrew: async (id) => {
    return getEntityById({ label: Entity.IDS.CREW, id });
  },

  getCrewmate: async (id) => {
    return getEntityById({ label: Entity.IDS.CREWMATE, id });
  },

  getCrewmates: async (ids) => {
    return ids?.length > 0 ? getEntities({ label: Entity.IDS.CREWMATE, ids }) : [];
  },

  getAccountCrewmates: async (account) => {
    return getEntities({ match: { 'Nft.owners.starknet': account }, label: Entity.IDS.CREWMATE });
  },

  getPlanets: async () => {
    // TODO: this will move to sdk
    const response = {};//await instance.get('/${apiVersion}/planets');
    return response.data;
  },

  getShip: async (id) => {
    return getEntityById({ label: Entity.IDS.SHIP, id });
  },

  getShipCrews: async (shipId) => {
    return getEntities({
      match: { 'Location.location': Location.toEntityFormat({ shipId }) },
      label: Entity.IDS.CREW
    });
  },

  getConstants: async (names) => {
    const response = await instance.get(`/${apiVersion}/constants/${Array.isArray(names) ? names.join(',') : names}`);
    return response.data;
  },

  getBook: async (id) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/${apiVersion}/books/${id}`);
    return response.data;
  },

  getStory: async (id, sessionId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/${apiVersion}/stories/${id}`, { params: { session: sessionId }});
    return response.data;
  },

  createStorySession: async (crewmate, story) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.post(`/${apiVersion}/stories/sessions`, { crewmate, story });
    return response.data;
  },

  getStorySession: async (id) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/${apiVersion}/stories/sessions/${id}`);
    return response.data;
  },

  getStoryPath: async (storyId, pathId, sessionId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(
      `/${apiVersion}/stories/${storyId}/paths/${pathId}`,
      { params: { session: sessionId } }
    );
    return response.data;
  },

  patchStorySessionPath: async (sessionId, pathId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.patch(`/${apiVersion}/stories/sessions/${sessionId}/paths/${pathId}`);
    return response.data;
  },

  deleteStorySessionPath: async (sessionId, pathId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.delete(`/${apiVersion}/stories/sessions/${sessionId}/paths/${pathId}`);
    return response.data;
  },

  getAdalianRecruitmentStory: async (id, sessionId) => {
    return null;  // TODO: restore this when story is ready again
    const response = await instance.get(`/${apiVersion}/stories/adalian-recruitment`);
    return response.data;
  },

  searchAssets: async (asset, query) => {
    const response = await instance.post('/_search/asteroid', query);
    return {
      hits: response.data.hits.hits.map((h) => h._source),
      total: response.data.hits.total.value
    }
  },

  requestLogin: async (account) => {
    const response = await instance.get(`/${apiVersion}/auth/login/${account}`);
    return response.data.message;
  },

  verifyLogin: async (account, params) => {
    const response = await instance.post(`/${apiVersion}/auth/login/${account}`, params);
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
