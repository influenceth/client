import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrew = (i) => {
  return useQuery(
    [ 'crew', i ],
    () => api.getCrew(i),
    { enabled: !!i }
  );
};

export default useCrew;
