import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useFaucetInfo = () => {
  const { starknet } = useSession();
  return useQuery(
    [ 'faucetInfo', starknet?.account ],
    () => api.faucetInfo(),
    { enabled: !!starknet?.account }
  );
};

export default useFaucetInfo;