import { useMemo } from 'react';
import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useWalletAgreements = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const crewIds = useMemo(() => {
    if (crewsLoading) return null;
    return (crews || []).map((c) => c.id);
  }, [crews, crewsLoading]);

  return useQuery(
    [ 'search', 'agreements', crewIds ],
    async () => api.getCrewAgreements(crewIds, accountAddress),
    { enabled: !!(accountAddress && crewIds) }
  );

  // TODO: 
  // update useBuildings? to use this
};

export default useWalletAgreements;