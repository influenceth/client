import { useMemo } from '~/lib/react-debug';
import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useWalletAgreements = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const crewIds = useMemo(import.meta.url, () => {
    if (crewsLoading) return null;
    return (crews || []).map((c) => c.id);
  }, [crews, crewsLoading]);

  return useQuery(
    [ 'agreements', accountAddress ],
    async () => api.getCrewAgreements(crewIds, accountAddress),
    { enabled: !!(accountAddress && crewIds) }
  );
};

export default useWalletAgreements;