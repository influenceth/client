import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { Building } from '@influenceth/sdk';

import useAuth from '~/hooks/useAuth';
import useChainTime from '~/hooks/useChainTime';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import getActivityConfig from '~/lib/activities';

const ActionItemContext = React.createContext();

export function ActionItemProvider({ children }) {
  const { account, token, walletContext: { starknet } } = useAuth();
  const chainTime = useChainTime();
  const { crew } = useCrewContext();

  const { data: actionItems, isLoading: actionItemsLoading } = useQuery(
    [ 'actionItems', crew?.i ],
    () => api.getCrewActionItems(),
    { enabled: !!crew?.i }
  );

  const { data: plannedBuildings, isLoading: plannedBuildingsLoading } = useQuery(
    [ 'planned', crew?.i ],
    () => api.getCrewPlannedBuildings(crew?.i),
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
        .filter((a) => a.event.returnValues?.finishTime <= liveBlockTime)
        .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime)
    );

    setUnreadyItems(
      (actionItems || [])
        .filter((a) => a.event.returnValues?.finishTime > liveBlockTime)
        .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime)
    );

    setPlannedItems(
      (plannedBuildings || [])
        // .filter((a) => a.Building.plannedAt + Building.GRACE_PERIOD >= nowTime)
        .map((a) => ({
          ...a,
          waitingFor: a.Building.plannedAt + Building.GRACE_PERIOD > liveBlockTime ? a.Building.plannedAt + Building.GRACE_PERIOD : null
        }))
        .sort((a, b) => a.plannedAt - b.plannedAt)
    );
  }, [actionItems, plannedBuildings, liveBlockTime]);

  const nextCompletionTime = useMemo(() => {
    return [...plannedItems, ...unreadyItems].reduce((acc, cur) => {
      const relevantTime = cur.waitingFor || cur.event?.returnValues?.finishTime;
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

  const allVisibleItems = useMemo(() => {
    if (!account || !token) return [];

    // return the readyItems whose "finishing transaction" is not already pending
    const visibleReadyItems = readyItems.filter((item) => {
      if (pendingTransactions) {
        return !getActivityConfig(item).isActionItemHidden(pendingTransactions);
      }
      return true;
    });

    const visiblePlannedItems = plannedItems.filter((item) => {
      if (pendingTransactions) {
        return !pendingTransactions.find((tx) => (
          ['START_CONSTRUCTION', 'UNPLAN_CONSTRUCTION'].includes(tx.key)
          && tx.vars.asteroidId === item.asteroid
          && tx.vars.lotId === item.i
        ));
      }
      return true;
    });

    return [
      ...(pendingTransactions || []).map((item) => ({ ...item, type: 'pending' })),
      ...(failedTransactions || []).map((item) => ({ ...item, type: 'failed' })),
      ...(visibleReadyItems || []).map((item) => ({ ...item, type: 'ready' })),
      ...(visiblePlannedItems || []).map((item) => ({ ...item, type: 'plans' })),
      ...(unreadyItems || []).map((item) => ({ ...item, type: 'unready' }))
    ].map((x) => {  // make sure everything has a key
      if (!x.key) x.key = `${x.type}_${x.txHash || x.id || x.timestamp || x.gracePeriodEnd}`;
      return x;
    });

  }, [pendingTransactions, failedTransactions, readyItems, plannedItems, unreadyItems, account, token]);


  // TODO: clear timers in the serviceworker
  //  for not yet ready to finish, set new timers based on time remaining

  // without memoizing, triggers as if new value on every chainTime update
  const contextValue = useMemo(() => ({
    allVisibleItems,
    liveBlockTime,
    pendingTransactions,
    failedTransactions,
    readyItems,
    plannedItems,
    unreadyItems,
    actionItems,
    isLoading: actionItemsLoading || plannedBuildingsLoading
  }), [
    allVisibleItems,
    liveBlockTime,
    pendingTransactions,
    failedTransactions,
    readyItems,
    plannedItems,
    unreadyItems,
    actionItems,
    actionItemsLoading,
    plannedBuildingsLoading
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
  //     if (event.returnValues?.finishTime) {
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
  //         isReady: chainTime >= event.returnValues.finishTime,
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
  //       const readyIn = (ai.returnValues.finishTime - chainTime) + 5;
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