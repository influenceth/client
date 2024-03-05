import { useQuery } from 'react-query';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const useFaucetInfo = () => {
  const { walletContext: { starknet } } = useAuth();
  return useQuery(
    [ 'faucetInfo', starknet?.account ],
    () => api.faucetInfo(),
    { enabled: !!starknet?.account }
  );
};

export default useFaucetInfo;