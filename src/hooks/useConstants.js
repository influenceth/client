import { useQuery } from 'react-query';

import api from '~/lib/api';

const parseAs = {
  ADALIAN_PRICE_ETH: BigInt,
  ASTEROID_BASE_PRICE_ETH: BigInt,
  ASTEROID_LOT_PRICE_ETH: BigInt,
  // ASTEROID_MERKLE_ROOT: null,
  // ASTEROID_SALE_LIMIT: null,
  CREW_SCHEDULE_BUFFER: parseInt,
  // LAUNCH_TIME: null,
  // SOFT_LAUNCH_TIME: null,
  TIME_ACCELERATION: parseInt,
};

const useConstants = (constantOrConstants) => {
  return useQuery(
    [ 'constants', constantOrConstants ],
    async () => {
      const isArr = Array.isArray(constantOrConstants);
      const c = await api.getConstants(isArr ? constantOrConstants : [constantOrConstants]);
      Object.keys(c).forEach((k) => c[k] = parseAs[k] ? parseAs[k](c[k]) : c[k]);
      return isArr ? c : c[constantOrConstants];
    },
    { enabled: !!constantOrConstants }
  );
};

export default useConstants;
