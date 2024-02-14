import { useMemo } from 'react';

import useCrewContext from '~/hooks/useCrewContext';

const useBookTokens = (bookId) => {
  const { captain, isLoading: crewIsLoading } = useCrewContext();
  
  const bookTokens = useMemo(() => {
    switch (bookId) {
      case 'random-1.json': {
        return {
          captainName: captain?.Name?.name
        };
      }
    }
    return null;
  }, [bookId, captain]);

  return useMemo(() => ({
    bookTokens,
    isLoading: crewIsLoading
  }), [bookTokens, crewIsLoading]);
}

export default useBookTokens;