import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const useMintableCrew = () => {
  const { account } = useAuth();

  // TODO: this is a deprecated concept on L2 until we start
  //  selling starter packs or crew credits
  return useQuery(
    [ 'asteroids', 'mintableCrew', { owner: account } ],
    () => 0, //api.getMintableCrew({ owner: account }),
    { enabled: !!account }
  );
};

export default useMintableCrew;
