import { useQuery } from 'react-query';

import api from '~/lib/api';

const useEntity = (props) => {
  const { label, id } = props || {};
  return useQuery(
    [ 'entity', label, id ],
    () => api.getEntityById({ label, id }),
    { enabled: !!(label && id) }
  );
};

export default useEntity;
