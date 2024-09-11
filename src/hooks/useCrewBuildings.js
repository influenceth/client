import { useMemo } from '~/lib/react-debug';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletBuildings from '~/hooks/useWalletBuildings';

const useCrewBuildings = () => {
  const { crew } = useCrewContext();
  const { data, isLoading } = useWalletBuildings();

  return useMemo(import.meta.url, () => {
    return {
      data: crew?.id && !isLoading && data
        ? data?.filter((a) => (a.Control?.controller?.id === crew?.id))
        : undefined,
      isLoading
    }
  }, [crew?.id, data, isLoading])
};

export default useCrewBuildings;
