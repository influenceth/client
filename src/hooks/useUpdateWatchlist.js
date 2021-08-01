import { useQueryClient, useMutation } from 'react-query';
import axios from 'axios';

import useAuth from '~/hooks/useAuth';

const useUpdateWatchlist = () => {
  const { token, authenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation(async (watchlist) => {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/v1/user/watchlist`,
      watchlist,
      { headers: { Authorization: `Bearer ${token}` }}
    );

    return response.data;
  },
  {
    enabled: !!authenticated,
    onSuccess: async () => {
      await queryClient.invalidateQueries([ 'user', token ]);
    }
  });
};

export default useUpdateWatchlist;
