import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import useAuth from '~/hooks/useAuth';
import useChainTime from '~/hooks/useChainTime';
import useCrew from '~/hooks/useCrew';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const ActionItemContext = React.createContext();

export function ActionItemProvider({ children }) {
  const chainTime = useChainTime();
  const { crew } = useCrew();

  const { data: actionItems } = useQuery(
    [ 'actionItems', crew?.i ],
    () => api.getCrewActionItems(),
    { enabled: !!crew?.i }
  );
  const { data: plannedLots } = useQuery(
    [ 'planned', crew?.i ],
    () => api.getCrewPlannedLots(),
    { enabled: !!crew?.i }
  );

  const pendingTransactions = useStore(s => s.pendingTransactions);
  const failedTransactions = useStore(s => s.failedTransactions);
  const [readyItems, setReadyItems] = useState([]);
  const [unreadyItems, setUnreadyItems] = useState([]);

  const refreshItems = useCallback(() => {
    setReadyItems(
      (actionItems || [])
        .filter((i) => i.event?.returnValues?.completionTime < chainTime)
    );

    const unreadyActionItems = (actionItems || [])
      .filter((i) => i.event?.returnValues?.completionTime >= chainTime)
      .map((e) => ({
        ...e,
        _sortTime: e.event?.returnValues?.completionTime
      }));
    const unstartedPlans = (plannedLots || [])
      .filter((i) => i.gracePeriodEnd >= chainTime)
      .map((e) => ({
        ...e,
        _sortTime: e.gracePeriodEnd,
        __t: 'plans'
      }));

    setUnreadyItems([...unreadyActionItems, ...unstartedPlans].sort((a, b) => a._sortTime - b._sortTime));
  }, [actionItems, plannedLots]);
  useEffect(refreshItems, [refreshItems]);

  const nextCompletionTime = useMemo(() => unreadyItems.reduce((acc, cur) => {
      return (acc === null || cur._sortTime < acc)
        ? cur._sortTime
        : acc;
    }, null)
  , [unreadyItems]);

  useEffect(() => {
    if (nextCompletionTime) {
      console.log('setting timeout in ' + 1000 * (nextCompletionTime - chainTime));
      const to = setTimeout(() => {
        refreshItems();
      }, 1000 * (nextCompletionTime - chainTime + 1));
      return () => {
        if (to) clearTimeout(to);
      }
    }
  }, [nextCompletionTime, refreshItems]);

  // TODO: set timeout to re-eval ready items at next scheduled completionTime


  // TODO: split actionitems into ready-to-finish and not
  // const readyToFinish

  // TODO: clear timers in the serviceworker
  //  for not yet ready to finish, set new timers based on time remaining




  // TODO: pending and failed transactions are already in context
  //  - ready/unready are only relevant in UI
  //  - probably only need to return actionItems here
  //  - this may even be overkill as a context (although will have to see once implement browser notifications)
  return (
    <ActionItemContext.Provider value={{
      pendingTransactions,
      failedTransactions,
      readyItems,
      unreadyItems,
      actionItems
    }}>
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