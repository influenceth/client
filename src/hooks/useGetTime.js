import { useCallback } from 'react';
import { Time } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';

const useGetTime = () => {
  const timeOverride = useStore(s => s.timeOverride);

  return useCallback((overrideNow) => {
    const now = overrideNow || Date.now();
    const override = timeOverride || {};

    let preciseTime = override.anchor || (((now / 1000) - Time.START_TIMESTAMP) / 3600);
    // console.log('override.speed', now - override.ts);
    // if (override.speed) preciseTime += override.speed * (now - override.ts) / 30;
    if (override.speed) preciseTime += (override.speed - 1) * (now - override.ts) / 3600e3;
    return preciseTime;
  }, [timeOverride]);
};

export default useGetTime;
