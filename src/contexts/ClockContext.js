import React, { useCallback, useEffect, useState } from 'react';

import useGetTime from '~/hooks/useGetTime';
import useInterval from '~/hooks/useInterval';
import { orbitTimeToGameTime, orbitTimeToRealDate } from '~/lib/utils';

const INTERVAL_LENGTH = 1000 / 30;  // denominator is FPS for clock check

const ClockContext = React.createContext();

// NOTE: we only track coarseTime in state because we don't want a state update firing every ms
//  for every clock update... components that need higher precision can use `getTime` as needed
export function ClockProvider({ children }) {
  const getTime = useGetTime();

  const [contextValue, setContextValue] = useState({
    coarseTime: 0,
    displayTime: '',
    realWorldTime: 0,
  });

  const updateClock = useCallback(() => {
    const coarseTime = Math.floor(100 * getTime()) / 100;
    if (contextValue.coarseTime !== coarseTime) {
      const gameTime = orbitTimeToGameTime(coarseTime);
      setTimeout(() => { // setter gets slow at fast intervals, so return setInterval function before setting
        setContextValue({
          coarseTime,
          displayTime: `${gameTime >= 0 ? '' : ''}${gameTime.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          realWorldTime: orbitTimeToRealDate(coarseTime)
        });
      }, 0);
    }
  }, [contextValue, getTime]);
  useEffect(updateClock, []); // eslint-disable-line react-hooks/exhaustive-deps
  useInterval(updateClock, INTERVAL_LENGTH);

  return (
    <ClockContext.Provider value={contextValue}>
      {children}
    </ClockContext.Provider>
  );
}

export default ClockContext;