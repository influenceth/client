import { useMemo } from 'react';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletShips from '~/hooks/useWalletShips';

const useControlledShips = () => {
  const { crew } = useCrewContext();
  const { data, isLoading } = useWalletShips();

  return useMemo(() => {
    return {
      data: crew?.id && data
        ? (data || []).filter((a) => a.Control?.controller?.id === crew?.id)
        : undefined,
      isLoading
    }
  }, [crew?.id, data, isLoading])
};

export default useControlledShips;
