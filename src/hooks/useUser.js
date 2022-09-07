import { useQuery } from 'react-query';
import api from '~/lib/api';

import useAuth from '~/hooks/useAuth';

const useUser = () => {
  const { token } = useAuth();
  return useQuery(
    [ 'user', token ],
    () => api.getUser(),
    { enabled: !!token }
  );
};

export default useUser;
