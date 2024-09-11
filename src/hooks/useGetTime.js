import { useCallback } from '~/lib/react-debug';
import { Time } from '@influenceth/sdk';

import useConstants from '~/hooks/useConstants';
import useStore from '~/hooks/useStore';

const useGetTime = () => {
  const timeOverride = useStore(s => s.timeOverride);
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  return useCallback(import.meta.url, (overrideNow) => {
    const now = overrideNow || Date.now();
    let preciseTime = timeOverride?.anchor || Time.fromUnixMilliseconds(now, TIME_ACCELERATION).toOrbitADays();

    // console.log('override.speed', now - override.ts);
    // if (override.speed) preciseTime += override.speed * (now - override.ts) / 30;
    if (timeOverride?.speed) preciseTime += (timeOverride.speed - 1) * (now - timeOverride.ts) / (1e3 * Time.getSecondsPerAday(TIME_ACCELERATION));

    // console.log('preciseTime', preciseTime, Math.floor(coarseTimeInterval * preciseTime) / coarseTimeInterval);
    return preciseTime;
  }, [timeOverride, TIME_ACCELERATION]);
};

export default useGetTime;
