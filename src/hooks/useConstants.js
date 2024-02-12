import { useQuery } from 'react-query';

import api from '~/lib/api';

const useConstants = (constantOrConstants) => {
  // TODO: should we set this to get refetched on an interval?
  return useQuery(
    [ 'constants', constantOrConstants ],
    async () => {
      const isArr = Array.isArray(constantOrConstants);
      const c = await api.getConstants(isArr ? constantOrConstants : [constantOrConstants]);
      // if (c.TIME_ACCELERATION) c.TIME_ACCELERATION = 24;
      // if (constantOrConstants === 'TIME_ACCELERATION') return 24;
      return isArr ? c : c[constantOrConstants];
    },
    { enabled: !!constantOrConstants }
  );
};

export default useConstants;
