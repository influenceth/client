import axios from 'axios';
import { Asteroid, Building, Entity } from '@influenceth/sdk';
import esb from 'elastic-builder';

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
      'X-Crew-Id': crewId || 0
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
  return new Promise((resolve, reject) => {
    getEntities({ label, ids: [id], components }).then(entities => {
      if (entities[0]) resolve(entities[0]);
      resolve(null);
    });
  });
};

const getEntities = async ({ ids, match, label, components }) => {
  const query = {};
  if (ids) {
    if (ids.length === 0) return [];
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

  getEntityActivities: async (entity, query = {}) => {
    const response = await instance.get(`/${apiVersion}/entities/${Entity.packEntity(entity)}/activity?${buildQuery(query)}`);
    return response.data;
  },

  getCrewActionItems: async () => {
    const response = await instance.get(`/${apiVersion}/user/activity/unresolved`);
    return response.data;
  },

  getCrewPlannedBuildings: async (crewId) => {
    const queryBuilder = esb.boolQuery();
    queryBuilder.filter(esb.termQuery('Building.status', Building.CONSTRUCTION_STATUS_IDS.PLANNED));
    queryBuilder.filter(esb.termQuery('Control.controller.id', crewId));

    const q = esb.requestBodySearch();
    q.query(queryBuilder);
    q.from(0);
    q.size(10000);
    const query = q.toJSON();

    const response = await instance.post(`/_search/building`, query);
    return response.data.hits.hits.map((h) => h._source) || [];
  },

  getCrewLocation: async (id) => {
    // this is a little unconventional compared to the rest of the api (i.e. to pull a single id from es),
    // but since es already has a flattened location, it feels like a worthwhile shortcut
    const q = esb.requestBodySearch();
    const queryBuilder = esb.boolQuery();
    queryBuilder.filter(esb.termQuery('id', id));
    q.query(queryBuilder);
    q.from(0);
    q.size(1);
    const query = q.toJSON();

    const response = await instance.post(`/_search/crew`, query);
    const [crew] = (response.data.hits.hits.map((h) => h._source) || []);

    const lotLocation = crew.Location.locations.find((l) => l.label === Entity.IDS.LOT);
    return {
      asteroidId: crew.Location.locations.find((l) => Number(l.label) === Entity.IDS.ASTEROID)?.id,
      lotId: lotLocation ? Entity.toPosition(lotLocation)?.lotId : null,
      buildingId: crew.Location.locations.find((l) => l.label === Entity.IDS.BUILDING)?.id,
      shipId: crew.Location.locations.find((l) => l.label === Entity.IDS.SHIP)?.id,
    };
  },

  // TODO: will we want this for "random" story events
  // getUserAssignments: async () => {
  //   const response = await instance.get(`/${apiVersion}/user/assignments`);
  //   return response.data;
  // },

  getActivities: async (query) => {
    const response = await instance.get(`/${apiVersion}/user/activity${query ? `?${buildQuery(query)}` : ''}`);
    return {
      activities: response.data,
      totalHits: query?.returnTotal ? parseInt(response.headers['total-hits']) : undefined,
      blockNumber: parseInt(response.headers['starknet-block-number'])
    };
  },

  getTransactionActivities: async (txHashes) => {
    const response = await instance.get(`/${apiVersion}/activity?${buildQuery({ txHash: txHashes.join(',') })}`);
    return {
      activities: response.data,
      blockNumber: parseInt(response.headers['starknet-block-number'])
    }
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

  getAsteroid: async (id) => { //, extended = false) => {
    // TODO: deprecate `extended` OR need to pass extra queryString to getEntityById OR need a separate call for that data
    // const response = await instance.get(`/${apiVersion}/asteroids/${i}${extended ? '?extended=1' : ''}`);
    return getEntityById({ label: Entity.IDS.ASTEROID, id });
  },

  getAsteroids: async (ids) => {
    return ids?.length > 0 ? getEntities({ ids, label: Entity.IDS.ASTEROID }) : [];
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
  getBuilding: async (id) => {
    return getEntityById({ label: Entity.IDS.BUILDING, id });
  },

  getCrewOccupiedLots: async (a, c) => {
    return [];
    // TODO: elasticsearch
    // const response = await instance.get(`/${apiVersion}/asteroids/${a}/lots/occupier/${c}`);
    // return response.data;
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
    let entity = await getEntityById(Entity.fromPosition({ asteroidId, lotId }));
    entity = entity ? entity : Entity.fromPosition({ asteroidId, lotId });
    const entities = await getEntities({
      match: { 'Location.location': Entity.fromPosition({ asteroidId, lotId }) },
      components: [ 'Building', 'Control' ]
    });

    entity.building = entities.find(e => e.label === Entity.IDS.BUILDING);
    entity.ship = entities.find(e => e.label === Entity.IDS.SHIP);
    entity.deposits = entities.filter(e => e.label === Entity.IDS.DEPOSIT);

    return entity;
  },

  getNameUse: async (label, name) => {
    return getEntities({ match: { 'Name.name': name }, label, components: [] });
  },

  getOwnedCrews: async (account) => {
    return getEntities({ match: { 'Crew.delegatedTo': account }, label: Entity.IDS.CREW });
  },

  getCrew: async (id) => {
    return getEntityById({ id, label: Entity.IDS.CREW });
  },

  getCrewmate: async (id) => {
    return getEntityById({ id, label: Entity.IDS.CREWMATE });
  },

  getCrewmates: async (ids) => {
    return ids?.length > 0 ? getEntities({ ids, label: Entity.IDS.CREWMATE }) : [];
  },

  getAccountCrewmates: async (account) => {
    return getEntities({ match: { 'Nft.owners.starknet': account }, label: Entity.IDS.CREWMATE });
  },

  getShip: async (id) => {
    return getEntityById({ id, label: Entity.IDS.SHIP });
  },

  getShipCrews: async (shipId) => {
    return getEntities({
      match: { 'Location.location': { id: shipId, label: Entity.IDS.SHIP } },
      label: Entity.IDS.CREW
    });
  },

  getConstants: async (names) => {
    const response = await instance.get(`/${apiVersion}/constants/${Array.isArray(names) ? names.join(',') : names}`);
    return response.data;
  },

  getAsteroidSale: async () => {
    const response = await instance.get(`/${apiVersion}/sales/asteroid`);
    return response.data;
  },

  // getBook: async (id) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.get(`/${apiVersion}/books/${id}`);
  //   return response.data;
  // },

  // getStory: async (id, sessionId) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.get(`/${apiVersion}/stories/${id}`, { params: { session: sessionId }});
  //   return response.data;
  // },

  // createStorySession: async (crewmate, story) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.post(`/${apiVersion}/stories/sessions`, { crewmate, story });
  //   return response.data;
  // },

  // getStorySession: async (id) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.get(`/${apiVersion}/stories/sessions/${id}`);
  //   return response.data;
  // },

  // getStoryPath: async (storyId, pathId, sessionId) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.get(
  //     `/${apiVersion}/stories/${storyId}/paths/${pathId}`,
  //     { params: { session: sessionId } }
  //   );
  //   return response.data;
  // },

  // patchStorySessionPath: async (sessionId, pathId) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.patch(`/${apiVersion}/stories/sessions/${sessionId}/paths/${pathId}`);
  //   return response.data;
  // },

  // deleteStorySessionPath: async (sessionId, pathId) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.delete(`/${apiVersion}/stories/sessions/${sessionId}/paths/${pathId}`);
  //   return response.data;
  // },

  // getAdalianRecruitmentStory: async (id, sessionId) => {
  //   return null;  // TODO: restore this when story is ready again
  //   const response = await instance.get(`/${apiVersion}/stories/adalian-recruitment`);
  //   return response.data;
  // },

  searchAssets: async (asset, query) => {
    const assetIndex = asset.replace(/s$/, '').toLowerCase();
    const response = await instance.post(`/_search/${assetIndex}`, query);

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

  // createDevnetBlock: async () => {
  //   return;
  //   try {
  //     axios.post(`${process.env.REACT_APP_STARKNET_NETWORK}/create_block`, {});
  //   } catch (e) {
  //     console.warn(e);
  //   }
  // }
};

export default api;
