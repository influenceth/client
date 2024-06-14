import { useMemo } from 'react';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletAgreements from '~/hooks/useWalletAgreements';

const useCrewAgreements = (enabled = true, includeWhereLessor = true, includeWhereLessee = true) => {
  const { crew } = useCrewContext();
  const { data, isLoading } = useWalletAgreements();

  return useMemo(() => {
    return {
      data: crew?.id && enabled && data
        ? data?.filter((a) => (
          (includeWhereLessor && a.Control?.controller?.id === crew?.id)
          || (includeWhereLessee && a._agreement?.permitted?.id === crew?.id)
        ))
        : undefined,
      isLoading
    }
  }, [crew?.id, data, isLoading, enabled, includeWhereLessor, includeWhereLessee])
};

export default useCrewAgreements;
