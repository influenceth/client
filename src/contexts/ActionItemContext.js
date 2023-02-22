import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import useAuth from '~/hooks/useAuth';
import useChainTime from '~/hooks/useChainTime';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const ActionItemContext = React.createContext();

export function ActionItemProvider({ children }) {
  const { walletContext: { starknet } } = useAuth();
  const chainTime = useChainTime();
  const { crew } = useCrewContext();

  const { data: actionItems } = useQuery(
    [ 'actionItems', crew?.i ],
    () => api.getCrewActionItems(),
    { enabled: !!crew?.i }
  );

  // TODO: probably could move planned lots into actionitems component
  const { data: plannedLots } = useQuery(
    [ 'planned', crew?.i ],
    () => api.getCrewPlannedLots(),
    { enabled: !!crew?.i }
  );

  const pendingTransactions = useStore(s => s.pendingTransactions);
  const failedTransactions = useStore(s => s.failedTransactions);
  const [liveBlockTime, setLiveBlockTime] = useState(0);
  const [readyItems, setReadyItems] = useState([]);
  const [unreadyItems, setUnreadyItems] = useState([]);
  const [plannedItems, setPlannedItems] = useState([]);


  // TODO: "Starknet could not be reached."
  // TODO: if block time > 2m, error; if error, set error
  const refetchBlockTime = useCallback(async (untilGreaterThan = 0) => {
    if (starknet?.provider) {
      let blockTimestamp = 0;
      try {
        const block = await starknet.provider.getBlock();
        blockTimestamp = block?.timestamp;
        setLiveBlockTime(blockTimestamp);
      } catch(e) {
        console.warn(e);
      }
      
      if (blockTimestamp < untilGreaterThan) {
        setTimeout(() => {
          refetchBlockTime(untilGreaterThan);
        }, 3000); // TODO: exponential backoff might be appropriate
      }
    }
  }, [starknet?.provider]);

  useEffect(refetchBlockTime, [refetchBlockTime]);

  useEffect(() => {
    if (!liveBlockTime) return;

    setReadyItems(
      (actionItems || [])
        .filter((i) => i.data?.completionTime <= liveBlockTime)
        .sort((a, b) => a.data?.completionTime - b.data?.completionTime)
    );

    setUnreadyItems(
      (actionItems || [])
        .filter((i) => i.data?.completionTime > liveBlockTime)
        .sort((a, b) => a.data?.completionTime - b.data?.completionTime)
    );

    setPlannedItems(
      (plannedLots || [])
        // .filter((i) => i.gracePeriodEnd >= nowTime)
        .map((a) => ({ ...a, waitingFor: a.gracePeriodEnd > liveBlockTime ? a.gracePeriodEnd : null }))
        .sort((a, b) => a.gracePeriodEnd - b.gracePeriodEnd)
    );
  }, [actionItems, plannedLots, liveBlockTime]);

  const nextCompletionTime = useMemo(() => {
    return [...plannedItems, ...unreadyItems].reduce((acc, cur) => {
      const relevantTime = cur.waitingFor || cur.data?.completionTime;
      if (relevantTime && relevantTime && (acc === null || relevantTime < acc)) {
        return relevantTime;
      }
      return acc;
    }, null);
  }, [plannedItems, unreadyItems]);

  useEffect(() => {
    if (nextCompletionTime) {
      const nextRefreshTime = (nextCompletionTime + 1);
      const to = setTimeout(() => {
        refetchBlockTime(nextCompletionTime);
      }, Math.max(0, 1000 * (nextRefreshTime - chainTime)));
      return () => {
        if (to) clearTimeout(to);
      }
    }
  }, [nextCompletionTime]);

  // TODO: clear timers in the serviceworker
  //  for not yet ready to finish, set new timers based on time remaining

  // without memoizing, triggers as if new value on every chainTime update
  const contextValue = useMemo(() => ({
    liveBlockTime,
    pendingTransactions,
    failedTransactions,
    readyItems,
    plannedItems,
    unreadyItems,
    actionItems
  }), [
    liveBlockTime,
    pendingTransactions,
    failedTransactions,
    readyItems,
    plannedItems,
    unreadyItems,
    actionItems
  ]);

  // TODO: pending and failed transactions are already in context
  //  - ready/unready are only relevant in UI
  //  - probably only need to return actionItems here
  //  - this may even be overkill as a context (although will have to see once implement browser notifications)
  return (
    <ActionItemContext.Provider value={contextValue}>
      {children}
    </ActionItemContext.Provider>
  );



  // console.log(actionItems);

  // const { events } = useEvents();
  // const [readyTally, setReadyTally] = useState(0);
  // const actionItemz = useMemo(() => {
  //   if (!events) return;

  //   const openItems = [];
  //   events.forEach((event) => {
  //     if (event.returnValues?.completionTime) {
  //       const waitingOn = {};
  //       if (event.event === 'Asteroid_ScanStarted') {
  //         waitingOn.event = 'Asteroid_ScanFinished';
  //         waitingOn.vars = { asteroidId: event.returnValues.asteroidId };
  //       }
  //       if (event.event === 'Construction_Started') {
  //         waitingOn.event = 'Construction_Finished';
  //         waitingOn.vars = { capableId: event.returnValues.capableId };
  //       }
  //       // if (event.event === 'CoreSample_startSampling') {
  //       //   waitingOn.event = 'CoreSample_finishSampling';
  //       //   waitingOn.vars = { asteroidId: event.returnValues.asteroidId };
  //       // }
  //       openItems.push({
  //         ...event,
  //         isReady: chainTime >= event.returnValues.completionTime,
  //         waitingOn
  //       });
  //     }
  //   }, []);

  //   return openItems.filter(({ waitingOn }) => {
  //     return !events.find((e) => {
  //       if (e.event === waitingOn.event) {
  //         if (!Object.keys(waitingOn.vars).find((k) => e.returnValues[k] !== waitingOn.vars[k])) {
  //           return true;
  //         }
  //       }
  //       return false;
  //     })
  //   });
  // }, [events, readyTally]);

  // // TODO: this timer should technically be in service worker so can use push notifications if window is not focused
  // // only need to watch one timer because will re-fetch all actionItemz when it passes
  // const nextTimer = useRef();
  // useEffect(() => {
  //   actionItemz.forEach((ai) => {
  //     if (!ai.isReady && !nextTimer.current) {
  //       const readyIn = (ai.returnValues.completionTime - chainTime) + 5;
  //       nextTimer.current = setTimeout(() => {
  //         console.log('Something is ready.');
  //         setReadyTally((i) => i + 1);
  //         nextTimer.current = null;
  //       }, readyIn * 1000);
  //     }
  //   });
  //   return () => {
  //     if (nextTimer.current) clearTimeout(nextTimer.current);
  //     nextTimer.current = null;
  //   };
  // }, [actionItemz]);

  // return (
  //   <ActionItemContext.Provider value={actionItemz}>
  //     {children}
  //   </ActionItemContext.Provider>
  // );
}

export default ActionItemContext;