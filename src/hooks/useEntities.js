import { useQuery } from 'react-query';

import api from '~/lib/api';

const useEntities = (props) => {
  const { label, ids } = props || {};
  return useQuery(
    [ 'entities', label, ids?.join(',') ],
    () => api.getEntities({ label, ids }),
    { enabled: !!(label && ids?.length > 0) }
  );
};

export default useEntities;
