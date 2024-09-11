import { useMemo } from '~/lib/react-debug';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletShips from '~/hooks/useWalletShips';

const useCrewShips = () => {
  const { crew } = useCrewContext();
  const { data, isLoading } = useWalletShips();

  return useMemo(import.meta.url, () => {
    return {
      data: crew?.id && !isLoading && Array.isArray(data)
        ? data.filter((a) => (a.Control?.controller?.id === crew?.id))
        : undefined,
      isLoading
    }
  }, [crew?.id, data, isLoading])
};

export default useCrewShips;
