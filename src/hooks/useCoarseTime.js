import { useEffect, useMemo, useState } from 'react';
import { Time } from '@influenceth/sdk';

import useConstants from '~/hooks/useConstants';
import useGetTime from '~/hooks/useGetTime';
import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';
import { displayTimeFractionDigits } from '~/lib/utils';

const defaultDenom = Math.pow(10, displayTimeFractionDigits);
const minInterval = 1000 / 30; // no reason to update more often than FPS

const formatAsCoarseTime = (preciseTime, denom) => {
  return Math.floor(denom * preciseTime) / denom;
}

const useCoarseTime = (ignoreSimulatedTimeAnchor = false, denom = defaultDenom) => {
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');
  const getTime = useGetTime(ignoreSimulatedTimeAnchor);

  const timeOverride = useStore(s => s.timeOverride);

  const [coarseTime, setCoarseTime] = useState(formatAsCoarseTime(getTime(), denom));
  const [syncing, setSyncing] = useState(true);

  // this only needs to run as often as 0.01 adays in real time (0.01 * 86400e3 == 864e3)
  const tickLength = useMemo(
    () => {
      if (timeOverride?.speed === 0) return null; // (tells useInterval to not run if clock paused)

      return Math.floor(Math.max(
        minInterval,
        Time.toRealDuration(86400e3 / denom, TIME_ACCELERATION) / Math.abs(timeOverride?.speed || 1)
      ));
    },
    [denom, TIME_ACCELERATION, timeOverride?.speed]
  );

  // sync to nearest coarseness (so any consumers all match each other in display)
  useEffect(() => {
    const currentTime = getTime();
    const currentCoarseTime = formatAsCoarseTime(currentTime, denom);
    setCoarseTime(currentCoarseTime);
    
    if (tickLength > 0) {
      // target next half-denom for start (i.e. if denom = 100, target 0.01 / 2 --> 0.005)
      // to avoid rounding issues, since the whole point of this timeout is to sync the intervals
      // to the same display values...
      const modulus = denom * (currentTime - currentCoarseTime);
      const targetStartIn = timeOverride?.speed < 0
        ? ((modulus > 0.5 ? -0.5 : 0.5) + modulus)  // (negative speed)
        : ((modulus > 0.5 ? 1.5 : 0.5) - modulus);  // (positive speed)
      const msUntilTarget = Math.ceil(Time.toRealDuration(86400e3 * targetStartIn / denom, TIME_ACCELERATION) / Math.abs(timeOverride?.speed || 1));

      if (msUntilTarget > minInterval) {
        setSyncing(true);
        const to = setTimeout(() => {
          setCoarseTime(formatAsCoarseTime(getTime(), denom));
          setSyncing(false);
        }, msUntilTarget);
        return () => clearTimeout(to);
      }
    } else {
      setSyncing(false);
    }
  }, [getTime, tickLength]);

  useInterval(() => {
    setCoarseTime(formatAsCoarseTime(getTime(), denom));
  }, syncing ? null : tickLength);

  return coarseTime;
};

export default useCoarseTime;
