import { useMemo } from 'react';

import useCrewContext from '~/hooks/useCrewContext';
import useWalletAsteroids from '~/hooks/useWalletAsteroids';

const useCrewAsteroids = () => {
  const { crew } = useCrewContext();
  const { data, isLoading } = useWalletAsteroids();

  return useMemo(() => {
    return {
      data: crew?.id && !isLoading && Array.isArray(data)
        ? data.filter((a) => (a.Control?.controller?.id === crew?.id))
        : undefined,
      isLoading
    }
  }, [crew?.id, data, isLoading])
};

export default useCrewAsteroids;
