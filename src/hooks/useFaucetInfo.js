import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useFaucetInfo = () => {
  const { accountAddress } = useSession();
  return useQuery(
    [ 'faucetInfo', accountAddress ],
    () => api.faucetInfo(),
    { enabled: !!accountAddress }
  );
};

export default useFaucetInfo;