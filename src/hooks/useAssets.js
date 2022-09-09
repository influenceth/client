import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAssets = () => {
  return useQuery(
    [ 'assets' ],
    () => api.getAssets(),
    {}
  );
};

export default useAssets;
