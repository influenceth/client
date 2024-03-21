import { useEffect, useMemo, useState } from 'react';
import { Time } from '@influenceth/sdk';

import useConstants from '~/hooks/useConstants';
import useGetTime from '~/hooks/useGetTime';
import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';
import { displayTimeFractionDigits } from '~/lib/utils';

const defaultDenom = Math.pow(10, displayTimeFractionDigits);

const formatAsCoarseTime = (preciseTime, denom) => {
  return Math.floor(denom * preciseTime) / denom;
}

const useCoarseTime = (denom = defaultDenom) => {
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');
  const getTime = useGetTime();

  const timeOverride = useStore(s => s.timeOverride);

  const [coarseTime, setCoarseTime] = useState(formatAsCoarseTime(getTime(), denom));
  const [syncing, setSyncing] = useState(true);

  // this only needs to run as often as 0.01 adays in real time (0.01 * 86400e3 == 864e3)
  const tickLength = useMemo(
    () => {
      if (timeOverride?.speed === 0) return null; // (tells useInterval to not run if clock paused)

      return Math.floor(Math.max(
        1000 / 30, // no reason to update more often than FPS
        Time.toRealDuration(86400e3 / denom, TIME_ACCELERATION || Time.DEFAULT_TIME_ACCELERATION) / Math.abs(timeOverride?.speed || 1)
      ));
    },
    [denom, TIME_ACCELERATION, timeOverride?.speed]
  );

  // sync to nearest coarseness (so any consumers all match each other in display)
  useEffect(() => {
    if (tickLength > 0) {
      setSyncing(true);

      const realTime = Time.fromOrbitADays(getTime(), TIME_ACCELERATION || Time.DEFAULT_TIME_ACCELERATION).unixTimeMS;
      const timeUntilSync = tickLength - (realTime % tickLength) + 1;
      
      const to = setTimeout(() => setSyncing(false), timeUntilSync);
      return () => clearTimeout(to);
    }
  }, [tickLength]);

  useInterval(() => {
    setCoarseTime(formatAsCoarseTime(getTime(), denom));
  }, syncing ? null : tickLength);
  return coarseTime;
};

export default useCoarseTime;
