import { Building, Process, Product } from '@influenceth/sdk';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';

const SAFE_ID_START = 4 * 28561869; // 4x * total lots in belt

const simulationConfig = {
  accountAddress: '0x1234567890',
  asteroidId: 1,
  crewId: SAFE_ID_START,
  crewName: 'ADALIAN INTERNSHIP',
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
  startingSway: 25e6 * TOKEN_SCALE[TOKEN.SWAY]
};

export default simulationConfig;