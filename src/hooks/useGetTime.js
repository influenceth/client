import { useCallback } from 'react';
import { START_TIMESTAMP } from 'influence-utils';

import useStore from '~/hooks/useStore';

const useGetTime = () => {
  const timeOverride = useStore(s => s.timeOverride);
  return useCallback(() => {
    const now = Date.now();
    const override = timeOverride || {};
    let preciseTime = override.anchor || (((now / 1000) - START_TIMESTAMP) / 3600);
    if (override.speed) preciseTime += override.speed * (now - override.ts) / 30;
    return preciseTime;
  }, [timeOverride]);
};

export default useGetTime;
