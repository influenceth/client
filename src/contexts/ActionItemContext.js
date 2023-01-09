import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEvents from '~/hooks/useEvents';
import { getAdjustedNow } from '~/lib/utils';

const ActionItemContext = React.createContext();

export function ActionItemProvider({ children }) {
  // TODO: ...
  // const actionItems = useQuery(
  //   [ 'actionItems', token ],
  //   () => api.getEvents(0),
  //   { enabled: !!token }
  // );

  const { events } = useEvents();
  const [readyTally, setReadyTally] = useState(0);
  const actionItems = useMemo(() => {
    if (!events) return;

    const openItems = [];
    events.forEach((event) => {
      if (event.returnValues?.completionTime) {
        const waitingOn = {};
        if (event.event === 'Asteroid_ScanStarted') {
          waitingOn.event = 'Asteroid_ScanFinished';
          waitingOn.vars = { asteroidId: event.returnValues.asteroidId };
        }
        if (event.event === 'Construction_Started') {
          waitingOn.event = 'Construction_Finished';
          waitingOn.vars = { capableId: event.returnValues.capableId };
        }
        // if (event.event === 'CoreSample_startSampling') {
        //   waitingOn.event = 'CoreSample_finishSampling';
        //   waitingOn.vars = { asteroidId: event.returnValues.asteroidId };
        // }
        openItems.push({
          ...event,
          isReady: getAdjustedNow() >= event.returnValues.completionTime,
          waitingOn
        });
      }
    }, []);

    return openItems.filter(({ waitingOn }) => {
      return !events.find((e) => {
        if (e.event === waitingOn.event) {
          if (!Object.keys(waitingOn.vars).find((k) => e.returnValues[k] !== waitingOn.vars[k])) {
            return true;
          }
        }
        return false;
      })
    });
  }, [events, readyTally]);

  // TODO: this timer should technically be in service worker so can use push notifications if window is not focused
  // only need to watch one timer because will re-fetch all actionItems when it passes
  const nextTimer = useRef();
  useEffect(() => {
    actionItems.forEach((ai) => {
      if (!ai.isReady && !nextTimer.current) {
        const readyIn = (ai.returnValues.completionTime - getAdjustedNow()) + 5;
        nextTimer.current = setTimeout(() => {
          console.log('Something is ready.');
          setReadyTally((i) => i + 1);
          nextTimer.current = null;
        }, readyIn * 1000);
      }
    });
    return () => {
      if (nextTimer.current) clearTimeout(nextTimer.current);
      nextTimer.current = null;
    };
  }, [actionItems]);

  return (
    <ActionItemContext.Provider value={actionItems}>
      {children}
    </ActionItemContext.Provider>
  );
}

export default ActionItemContext;