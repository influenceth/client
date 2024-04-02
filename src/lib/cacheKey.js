import { Entity } from '@influenceth/sdk';

// TODO: write comments on why this is important
// TODO: - how to write filters for entities queries
// TODO: - how to review / add to activities.js

// TODO: probably drop the rest of the cache keys in here or activities.js and drop README.cache.js

const validFilterKeys = {
  // ['entities', Entity.IDS.ASTEROID, { controllerId }]
  // ['entities', Entity.IDS.ASTEROID, { owner }]
  [Entity.IDS.ASTEROID]: ['controllerId', 'owner'],

  // ['entities', Entity.IDS.BUILDING, { controllerId, status }]
  // ['entities', Entity.IDS.BUILDING, { asteroidId, hasPermission, hasComponent }]
  // ['entities', Entity.IDS.BUILDING, { asteroidId, hasComponent, status }]
  // ['entities', Entity.IDS.BUILDING, { asteroidId, controllerId }]
  // ['entities', Entity.IDS.BUILDING, { lotId }]
  [Entity.IDS.BUILDING]: ['asteroidId', 'controllerId', 'hasComponent', 'hasPermission', 'lotId', 'status'],

  // ['entities', Entity.IDS.CREW, { owner }]
  // ['entities', Entity.IDS.CREW, { stationUuid }]
  [Entity.IDS.CREW]: ['owner', 'stationUuid'],

  // ['entities', Entity.IDS.CREWMATE, { owner }]
  [Entity.IDS.CREWMATE]: ['owner'],

  // ['entities', Entity.IDS.DELIVERY, { destination, status }]
  // ['entities', Entity.IDS.DELIVERY, { origin, status }]
  [Entity.IDS.DELIVERY]: ['destination', 'origin', 'status'],

  // ['entities', Entity.IDS.DEPOSIT, { asteroidId, resourceId, controllerId, isDepleted }]
  // ['entities', Entity.IDS.DEPOSIT, { lotId }]
  [Entity.IDS.DEPOSIT]: ['asteroidId', 'controllerId', 'isDepleted', 'lotId', 'resourceId'],

  // ['entities', Entity.IDS.SHIP, { asteroidId, hasPermission, hasComponent, isOnSurface, status }]
  // ['entities', Entity.IDS.SHIP, { asteroidId, status }]
  // ['entities', Entity.IDS.SHIP, { controllerId }]
  // ['entities', Entity.IDS.SHIP, { lotId }]
  [Entity.IDS.SHIP]: ['asteroidId', 'controllerId', 'hasComponent', 'hasPermission', 'isOnSurface', 'lotId', 'status']
}

export const entitiesCacheKey = (label, filters) => {
  if (process.env.NODE_ENV === 'development') {
    if (typeof filters === 'object') {
      (Object.keys(filters).find((k) => {
        if (!validFilterKeys[label].includes(k)) {
          console.error(`Unsupported "entities" cache key filter: "${k}". Read the comments in lib/cacheKey.js to find out how to add support.`);
          return true;
        }
        return false;
      }))
    }
  }

  return ['entities', label, filters];
};




