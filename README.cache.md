# useQuery cache keys

TODO: document event + invalidation flow

newGroupEval: updatedValues (optimistic) + filters

*** 

## Non-entity based:

- [ 'actionItems', crewId ],
- [ 'activities', entityLabel, entityId, 'earliest' ],
- [ 'activities', entityLabel, entityId ],
- [ 'asteroidPackedLotData', asteroidId ]
- [ 'constants', constantOrConstants ],
- [ 'lotEntitiesPrepopulation', lotId ],
- [ 'ethBalance', accountAddress ],
- [ 'exchangeOrderSummary', asteroidId, product ],
- [ 'faucetInfo', account ],
- [ 'productOrderSummary', entityLabel, entityId ],
- [ 'referrals', 'count', token ],
- [ 'search', assetType, query ],
- [ 'swayBalance', accountAddress ],
- [ 'user', token ],
- [ 'watchlist', token ],

## Single Entity:

- [ 'entity', label, id ],

## Entity Groups:

### Asteroid
 - Full filter list:
    - controllerId
    - owner
 - Query cache keys:
    - ['entities', Entity.IDS.ASTEROID, { controllerId }]
    - ['entities', Entity.IDS.ASTEROID, { owner }]

### Building
 - Full filter list:
    - asteroidId
    - controllerId
    - hasComponent
    - hasPermission
    - lotId
    - status
 - Query cache keys:
    - ['entities', Entity.IDS.BUILDING, { controllerId, status }]
    - ['entities', Entity.IDS.BUILDING, { asteroidId, hasPermission, hasComponent }]
    - ['entities', Entity.IDS.BUILDING, { asteroidId, hasComponent, status }]
    - ['entities', Entity.IDS.BUILDING, { asteroidId, controllerId }]
    - ['entities', Entity.IDS.BUILDING, { lotId }]

### Crew
 - Full filter list:
    - owner
    - stationUuid
 - Query cache keys:
    - ['entities', Entity.IDS.CREW, { owner }]
    - ['entities', Entity.IDS.CREW, { stationUuid }]

### Crewmate
 - Full filter list:
    - owner
 - Query cache keys:
    - ['entities', Entity.IDS.CREWMATE, { owner }]

### Delivery
 - Full filter list:
    - destination
    - origin
    - status
 - Query cache keys:
    - ['entities', Entity.IDS.DELIVERY, { destination, status }]
    - ['entities', Entity.IDS.DELIVERY, { origin, status }]

### Deposit
 - Full filter list:
    - asteroidId
    - controllerId
    - depleted
    - lotId
    - resourceId
 - Query cache keys:
    - ['entities', Entity.IDS.DEPOSIT, { asteroidId, resourceId, controllerId, depleted }]
    - ['entities', Entity.IDS.DEPOSIT, { lotId }]

### Order
 - Full filter list:
    - controllerId
    - exchangeId
    - productId
    - status
 - Query cache keys:
    - ['entities', Entity.IDS.ORDER, { controllerId, status }]
    - ['entities', Entity.IDS.ORDER, { exchangeId, productId }]

### Ship
 - Full filter list:
    - asteroidId
    - controllerId
    - hasComponent
    - hasPermission
    - isOnSurface
    - lotId
    - status
 - Query cache keys:
    - ['entities', Entity.IDS.SHIP, { asteroidId, hasPermission, hasComponent, isOnSurface, status }]
    - ['entities', Entity.IDS.SHIP, { asteroidId, status }]
    - ['entities', Entity.IDS.SHIP, { controllerId }]
    - ['entities', Entity.IDS.SHIP, { lotId }]
