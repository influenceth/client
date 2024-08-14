import { Building, Process, Product, Inventory, Ship } from '@influenceth/sdk';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';

const SAFE_ID_START = 4 * 28561869; // 4x * total lots in belt

const simulationConfig = {
  accountAddress: '0x1234567890',
  asteroidId: 1,
  crewId: SAFE_ID_START,
  crewName: 'TRAINING SIMULATOR',
  crewmateId: SAFE_ID_START,
  depositId: SAFE_ID_START,
  processId: Process.IDS.HUELS_PROCESS,
  resourceId: Product.IDS.METHANE,
  destinationAsteroidId: 31,
  shipId: SAFE_ID_START,
  buildingIds: Object.values(Building.IDS).reduce((acc, v) => ({ ...acc, [v]: SAFE_ID_START + v }), {}),
  crewmates: {
    engineer: 7422,
    miner: 7535,
    merchant: 7538,
    pilot: 7539,
    scientist: 6891
  },
  startingSway: 25e6 * TOKEN_SCALE[TOKEN.SWAY],
  marketplaceAmounts: {
    [Product.IDS.ACETYLENE]: true, // "true" implies whatever is in warehouse
    [Product.IDS.CORE_DRILL]: 5,
    [Product.IDS.FOOD]: 5000,
    [Product.IDS.HYDROGEN_PROPELLANT]: Inventory.TYPES[Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].propellantInventoryType]?.massConstraint / 1e3,
  },

  fastForwardAnimationDuration: 2e3,
};

export default simulationConfig;