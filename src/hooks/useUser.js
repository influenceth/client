import { useQuery } from 'react-query';
import axios from 'axios';

import useAuth from '~/hooks/useAuth';

const useUser = () => {
  const { token, authed } = useAuth();

  return useQuery([ 'user', token ], async () => {
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/v1/user`,
      { headers: { Authorization: `Bearer ${token}` }}
    );

    return response.data;
  }, { enabled: !!authed });
};

export default useUser;
