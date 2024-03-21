import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Time } from '@influenceth/sdk';

import useGetTime from '~/hooks/useGetTime';
import useInterval from '~/hooks/useInterval';
import useConstants from '~/hooks/useConstants';
import useStore from '~/hooks/useStore';


const MIN_INTERVAL_LENGTH = 1000 / 30;  // denominator is FPS for clock check
const MAX_INTERVAL_LENGTH = 5000;

export const DISPLAY_TIME_FRACTION_DIGITS = 2;

const ClockContext = React.createContext();

// NOTE: we only track coarseTime in state because we don't want a state update firing every ms
//  for every clock update... components that need higher precision can use `getTime` as needed
export function ClockProvider({ children }) {
  const getTime = useGetTime();
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const timeOverride = useStore(s => s.timeOverride);

  const [contextValue, setContextValue] = useState({
    coarseTime: 0,
    displayTime: '',
    realWorldTime: 0,
  });


  // this only needs to run as often as 0.01 adays in real time (0.01 * 86400e3 == 864e3)
  const interval = useMemo(
    () => 
    Math.min(
      Math.max(
        MIN_INTERVAL_LENGTH,
        Time.toRealDuration(864e3, TIME_ACCELERATION || Time.DEFAULT_TIME_ACCELERATION) / Math.abs(timeOverride?.speed || 1)
      ),
      MAX_INTERVAL_LENGTH
    ),
    [TIME_ACCELERATION, timeOverride?.speed]
  );

  const updateClock = useCallback(() => {
    const coarseTimeInterval = 100 / (TIME_ACCELERATION / Time.DEFAULT_TIME_ACCELERATION);
    const coarseTime = Math.floor(coarseTimeInterval * getTime()) / coarseTimeInterval;
    if (contextValue.coarseTime !== coarseTime) {
      const gameTime = Time.fromOrbitADays(coarseTime, TIME_ACCELERATION).toGameClockADays();
      setTimeout(() => { // setter gets slow at fast intervals, so return setInterval function before setting
        setContextValue({
          coarseTime,
          displayTime: `${gameTime >= 0 ? '' : ''}${gameTime.toLocaleString(undefined, { minimumFractionDigits: DISPLAY_TIME_FRACTION_DIGITS })}`,
          realWorldTime: Time.fromOrbitADays(coarseTime, TIME_ACCELERATION).toDate()
        });
      }, 0);
    }
  }, [contextValue, getTime, TIME_ACCELERATION]);
  useEffect(updateClock, []); // eslint-disable-line react-hooks/exhaustive-deps
  useInterval(updateClock, interval);

  return (
    <ClockContext.Provider value={contextValue}>
      {children}
    </ClockContext.Provider>
  );
}

export default ClockContext;