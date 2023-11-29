import { useQuery } from 'react-query';

import api from '~/lib/api';

const useConstants = (constantOrConstants) => {
  // TODO: should we set this to get refetched on an interval?
  return useQuery(
    [ 'constants', constantOrConstants ],
    async () => {
      const isArr = Array.isArray(constantOrConstants);
      const c = await api.getConstants(isArr ? constantOrConstants : [constantOrConstants]);
      return isArr ? c : c[constantOrConstants];
    },
    { enabled: !!constantOrConstants }
  );
};

export default useConstants;
