import { Entity, Product } from '@influenceth/sdk';

const simulationConfig = {
  accountAddress: '0x1234567890',
  crewId: Number.MAX_SAFE_INTEGER,
  crewName: 'ADALIAN INTERNSHIP',
  crewmateId: Number.MAX_SAFE_INTEGER,
  resourceId: Product.IDS.BITUMEN,
  crewmates: {
    engineer: 7422,
    miner: 7535,
    merchant: 7538,
    pilot: 7539,
    scientist: 6891
  },
  
};

export default simulationConfig;