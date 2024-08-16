import { useMemo } from 'react';
import { Permission } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletAgreements from '~/hooks/useWalletAgreements';
import useBlockTime from '~/hooks/useBlockTime';

const useWalletLeasedLots = (asteroidId, enabled = true) => {
  const blockTime = useBlockTime();
  const { crews, loading: crewsLoading } = useCrewContext();
  const { data, isLoading: dataLoading } = useWalletAgreements();

  const crewIds = useMemo(() => {
    if (crewsLoading) return [];
    return (crews || []).map((c) => c.id);
  }, [crews, crewsLoading]);

  return useMemo(() => {
    return {
      data: enabled && data
        ? data?.filter((a) => (
          a._agreement.permission === Permission.IDS.USE_LOT
          && a._agreement.endTime > blockTime
          && crewIds.includes(a._agreement?.permitted?.id)
          && (!asteroidId || a.Location?.location?.id === asteroidId)
        ))
        : undefined,
      dataUpdatedAt: Date.now(),
      isLoading: dataLoading || crewsLoading
    }
  }, [blockTime, crewIds, crewsLoading, data, dataLoading, enabled])
};

export default useWalletLeasedLots;
