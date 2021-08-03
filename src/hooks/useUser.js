import { useQuery } from 'react-query';
import api from '~/lib/api';

import useAuth from '~/hooks/useAuth';

const useUser = () => {
  const { token } = useAuth();

  const getUser = useQuery([ 'user', token ], api.getUser, { enabled: !!token });

  return { getUser };
};

export default useUser;
