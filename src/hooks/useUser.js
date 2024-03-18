import { useQuery } from 'react-query';
import api from '~/lib/api';

import useSession from '~/hooks/useSession';

const useUser = () => {
  const { token } = useSession();
  return useQuery(
    [ 'user', token ],
    () => api.getUser(),
    { enabled: !!token }
  );
};

export default useUser;
