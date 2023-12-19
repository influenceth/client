import axios from 'axios';
import { Asteroid, Building, Deposit, Entity, Inventory, Ship } from '@influenceth/sdk';
import esb from 'elastic-builder';

import useStore from '~/hooks/useStore';
import { esbLocationQuery } from './utils';

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
    query.components = components.join(',');  // i.e. [ 'Celestial', 'Control' ]
  }

  const response = await instance.get(`/${apiVersion}/entities?${buildQuery(query)}`);
  return response.data;
};

const arrayComponents = {
  DryDock: 'DryDocks',
  Extractor: 'Extractors',
  Inventory: 'Inventories',
  Processor: 'Processors'
};

const formatESData = (responseData) => {
  return responseData?.hits?.hits?.map((h) => {
    return Object.keys(h._source).reduce((acc, k) => {
      if (!!arrayComponents[k]) {
        acc[arrayComponents[k]] = h._source[k] || [];
      } else {
        acc[k] = Array.isArray(h._source[k]) ? h._source[k][0] : h._source[k];
      }
      return acc;
    }, {});
  }) || [];
}

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
    queryBuilder.filter(esb.termQuery('Building.status', Building.CONSTRUCTION_STATUSES.PLANNED));
    queryBuilder.filter(esb.termQuery('Control.controller.id', crewId));

    const q = esb.requestBodySearch();
    q.query(queryBuilder);
    q.from(0);
    q.size(10000);
    const query = q.toJSON();

    const response = await instance.post(`/_search/building`, query);
    return formatESData(response.data);
  },

  getCrewBuildingsOnAsteroid: async (asteroidId, crewId) => {
    const queryBuilder = esb.boolQuery();

    // on asteroid
    queryBuilder.filter(esbLocationQuery({ asteroidId }));

    // controlled by crew
    queryBuilder.filter(esb.termQuery('Control.controller.id', crewId));

    // not abandoned
    queryBuilder.filter(esb.rangeQuery('Building.status').gt(0));

    const q = esb.requestBodySearch();
    q.query(queryBuilder);
    // q.from(0);
    // q.size(10000000);
    const query = q.toJSON();

    const response = await instance.post(`/_search/building`, query);
    return formatESData(response.data);
  },
  
  getCrewSamplesOnAsteroid: async (asteroidId, crewId, resourceId) => {
    const queryBuilder = esb.boolQuery();

    // on asteroid
    queryBuilder.filter(esbLocationQuery({ asteroidId }));

    // controlled by crew
    queryBuilder.filter(esb.termQuery('Control.controller.id', crewId));
    
    // resource
    queryBuilder.filter(esb.termQuery('Deposit.resource', resourceId));

    // not depleted !(used AND remainingYield === 0)
    queryBuilder.filter(
      esb.boolQuery().mustNot([
        esb.termQuery('Deposit.status', Deposit.STATUSES.USED),
        esb.termQuery('Deposit.remainingYield', 0),
      ])
    );

    const q = esb.requestBodySearch();
    q.query(queryBuilder);
    // q.from(0);
    // q.size(10000000);
    const query = q.toJSON();

    const response = await instance.post(`/_search/deposit`, query);
    return formatESData(response.data);
  },

  getCrewAccessibleInventories: async (asteroidId, crewId) => {
    const queryPromises = [];

    // BUILDINGS...
    const buildingQueryBuilder = esb.boolQuery();

    // controlled by crew
    // TODO: also include those crew does not control but has access to
    // buildingQueryBuilder.filter(esb.termQuery('Control.controller.id', crewId));
    
    // on asteroid
    buildingQueryBuilder.filter(esbLocationQuery({ asteroidId }));

    // has unlocked inventory
    buildingQueryBuilder.filter(
      esb.nestedQuery()
        .path('Inventory')
        .query(esb.termQuery('Inventory.status', Inventory.STATUSES.AVAILABLE))
    );
    
    const buildingQ = esb.requestBodySearch();
    buildingQ.query(buildingQueryBuilder);
    buildingQ.from(0);
    buildingQ.size(10000);
    queryPromises.push(instance.post(`/_search/building`, buildingQ.toJSON()));

    // SHIPS...
    const shipQueryBuilder = esb.boolQuery();

    // controlled by crew
    // TODO: also include those crew does not control but has access to
    shipQueryBuilder.filter(esb.termQuery('Control.controller.id', crewId));
    
    // on asteroid
    // (and not in orbit -- i.e. lotId is present and !== 0)
    shipQueryBuilder.filter(esbLocationQuery({ asteroidId }));
    shipQueryBuilder.filter(
      esb.nestedQuery()
        .path('meta.location')
        .query(
          esb.boolQuery().must([
            esb.termQuery('meta.location.label', Entity.IDS.LOT),
            esb.rangeQuery('meta.location.id').gt(0),
          ])
        )
    );

    // has unlocked inventory
    shipQueryBuilder.filter(esb.termQuery('Inventory.status', Inventory.STATUSES.AVAILABLE));

    // ship is operational and not traveling or in emergency mode
    shipQueryBuilder.filter(esb.termQuery('Ship.status', Ship.STATUSES.AVAILABLE));
    shipQueryBuilder.filter(esb.termQuery('Ship.emergencyAt', 0));

    const shipQ = esb.requestBodySearch();
    shipQ.query(shipQueryBuilder);
    shipQ.from(0);
    shipQ.size(10000);
    queryPromises.push(instance.post(`/_search/ship`, shipQ.toJSON()));

    // COMBINE...
    const responses = await Promise.allSettled(queryPromises);
    return responses.reduce((acc, r) => {
      if (r.status === 'fulfilled') {
        acc.push(...formatESData(r.value.data));
      }
      return acc;
    }, []);
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
    const shipQueryBuilder = esb.boolQuery();
    
    // on asteroid
    shipQueryBuilder.filter(esbLocationQuery({ asteroidId: i }));

    // ship is operational and not traveling or in emergency mode
    shipQueryBuilder.filter(esb.termQuery('Ship.status', Ship.STATUSES.AVAILABLE));

    const shipQ = esb.requestBodySearch();
    shipQ.query(shipQueryBuilder);
    shipQ.from(0);
    shipQ.size(10000);
    const response = await instance.post(`/_search/ship`, shipQ.toJSON());

    return formatESData(response.data);
  },

  getCrewShips: async (c) => {
    return getEntities({
      match: { 'Control.controller.id': c },
      label: Entity.IDS.SHIP
    })
  },

  getEntities,
  getEntityById,

  // getLot: async (lotId) => {
  //   const lotEntity = { id: lotId, label: Entity.IDS.LOT };

  //   const entity = (await getEntityById(lotEntity)) || lotEntity;

  //   const entities = await getEntities({
  //     match: { 'Location.locations': lotEntity },
  //     components: [ 'Building', 'Control', 'Deposit', 'Inventory', 'Location' ]
  //   });

  //   // NOTE: if add to these entity types, need to update useLot hook
  //   entity.building = entities.find(e => e.label === Entity.IDS.BUILDING);
  //   entity.ship = entities.find(e => e.label === Entity.IDS.SHIP);  // TODO: should this be an array?
  //   entity.deposits = entities.filter(e => e.label === Entity.IDS.DEPOSIT);

  //   return entity;
  // },

  getNameUse: async (label, name) => {
    return getEntities({ match: { 'Name.name': name }, label, components: [] });
  },

  getOwnedCrews: async (account) => {
    return getEntities({ match: { 'Crew.delegatedTo': account }, label: Entity.IDS.CREW });
  },

  getCrewmates: async (ids) => {
    return ids?.length > 0 ? getEntities({ ids, label: Entity.IDS.CREWMATE }) : [];
  },

  getAccountCrewmates: async (account) => {
    return getEntities({ match: { 'Nft.owners.starknet': account }, label: Entity.IDS.CREWMATE });
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
      hits: formatESData(response.data),
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
