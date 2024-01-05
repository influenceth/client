import { useCallback } from 'react';
import { Time } from '@influenceth/sdk';

import useConstants from '~/hooks/useConstants';
import useStore from '~/hooks/useStore';

const useGetTime = () => {
  const timeOverride = useStore(s => s.timeOverride);
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  return useCallback((overrideNow) => {
    const now = overrideNow || Date.now();
    const override = timeOverride || {};

    let preciseTime = override.anchor || Time.fromUnixMilliseconds(now, TIME_ACCELERATION).toOrbitADays();

    // console.log('override.speed', now - override.ts);
    // if (override.speed) preciseTime += override.speed * (now - override.ts) / 30;
    if (override.speed) preciseTime += (override.speed - 1) * (now - override.ts) / 3600e3;
    return preciseTime;
  }, [timeOverride, TIME_ACCELERATION]);
};

export default useGetTime;
