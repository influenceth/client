import { useCallback } from 'react';
import { Time } from '@influenceth/sdk';

import useConstants from '~/hooks/useConstants';
import useStore from '~/hooks/useStore';

const useGetTime = () => {
  const timeOverride = useStore(s => s.timeOverride);
  const { data: TIME_ACCELERATION, isLoading } = useConstants('TIME_ACCELERATION');

  return useCallback((overrideNow) => {
    if (isLoading) return 0;
    const now = overrideNow || Date.now();
    let preciseTime = timeOverride?.anchor || Time.fromUnixMilliseconds(now, TIME_ACCELERATION).toOrbitADays();

    // console.log('override.speed', now - override.ts);
    // if (override.speed) preciseTime += override.speed * (now - override.ts) / 30;
    if (timeOverride?.speed) preciseTime += (timeOverride.speed - 1) * (now - timeOverride.ts) / 3600e3;

    // console.log('preciseTime', preciseTime, Math.floor(coarseTimeInterval * preciseTime) / coarseTimeInterval);
    return preciseTime;
  }, [isLoading, timeOverride, TIME_ACCELERATION]);
};

export default useGetTime;
