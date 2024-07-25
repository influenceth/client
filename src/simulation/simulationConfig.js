import { Building, Entity, Product } from '@influenceth/sdk';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';

const SAFE_ID_START = 4 * 28561869; // 4x * total lots in belt

const simulationConfig = {
  accountAddress: '0x1234567890',
  crewId: SAFE_ID_START,
  crewName: 'ADALIAN INTERNSHIP',
  crewmateId: SAFE_ID_START,
  resourceId: Product.IDS.BITUMEN,
  buildingIds: Object.values(Building.IDS).reduce((acc, v) => ({ ...acc, [v]: SAFE_ID_START + v }), {}),
  crewmates: {
    engineer: 7422,
    miner: 7535,
    merchant: 7538,
    pilot: 7539,
    scientist: 6891
  },
  startingSway: 100e6 * TOKEN_SCALE[TOKEN.SWAY]
};

export default simulationConfig;