import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Building, Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import { hydrateActivities } from '~/lib/activities';

const ActionItemContext = React.createContext();

export function ActionItemProvider({ children }) {
  const { authenticated, blockTime } = useSession();
  const { crew, pendingTransactions } = useCrewContext();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();

  const crewId = crew?.id;

  const { data: actionItems, isLoading: actionItemsLoading } = useQuery(
    [ 'actionItems', crewId ],
    async () => {
      const activities = await api.getCrewActionItems(crewId);
      await hydrateActivities(activities, queryClient);
      return activities;
    },
    { enabled: !!crewId }
  );

  const { data: plannedBuildings, isLoading: plannedBuildingsLoading } = useQuery(
    [ 'entities', Entity.IDS.BUILDING, { controllerId: crewId, status: Building.CONSTRUCTION_STATUSES.PLANNED } ],
    () => api.getCrewPlannedBuildings(crewId),
    { enabled: !!crewId }
  );

  const failedTransactions = useStore(s => s.failedTransactions);
  const [readyItems, setReadyItems] = useState([]);
  const [unreadyItems, setUnreadyItems] = useState([]);
  const [plannedItems, setPlannedItems] = useState([]);

  const randomEventItems = useMemo(() => {
    if (crew?._actionTypeTriggered) {
      if (!(pendingTransactions || []).find((tx) => tx.key === 'ResolveRandomEvent')) {
        return [crew?._actionTypeTriggered];
      }
    }
    return [];
  }, [crew?._actionTypeTriggered, pendingTransactions]);

  useEffect(() => {
    if (!blockTime) return;

    setReadyItems(
      (actionItems || [])
        .filter((a) => a.event.name === 'DeliveryPackaged' || a.event.returnValues?.finishTime <= blockTime)
        .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime)
    );

    setUnreadyItems(
      (actionItems || [])
        .filter((a) => a.event.returnValues?.finishTime > blockTime)
        .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime)
    );

    setPlannedItems(
      (plannedBuildings || [])
        // .filter((a) => a.Building.plannedAt + Building.GRACE_PERIOD >= nowTime)
        .map((a) => {
          const gracePeriodEnd = a.Building.plannedAt + Building.GRACE_PERIOD;
          return {
            ...a,
            waitingFor: gracePeriodEnd > blockTime ? gracePeriodEnd : null
          };
        })
        .sort((a, b) => a.plannedAt - b.plannedAt)
    );
  }, [actionItems, plannedBuildings, blockTime]);

  const allVisibleItems = useMemo(() => {
    if (!authenticated) return [];

    // return the readyItems whose "finishing transaction" is not already pending
    const visibleReadyItems = readyItems.filter((item) => {
      if (pendingTransactions) {
        return !getActivityConfig(item)?.isActionItemHidden(pendingTransactions);
      }
      return true;
    });

    const visiblePlannedItems = plannedItems.filter((item) => {
      if (pendingTransactions) {
        return !pendingTransactions.find((tx) => (
          ['ConstructionStart', 'ConstructionAbandon'].includes(tx.key)
          && tx.vars.building.id === item.id
        ));
      }
      return true;
    });

    return [
      ...(pendingTransactions || []).map((item) => ({ ...item, type: 'pending' })),
      ...(failedTransactions || []).map((item) => ({ ...item, type: 'failed' })),
      ...(randomEventItems || []).map((item) => ({ ...item, type: 'randomEvent' })),
      ...(visibleReadyItems || []).map((item) => ({ ...item, type: 'ready' })),
      ...(visiblePlannedItems || []).map((item) => ({ ...item, type: 'plans' })),
      ...(unreadyItems || []).map((item) => ({ ...item, type: 'unready' }))
    ].map((x) => {  // make sure everything has a unique key (only plans should fall through to the label_id option)
      x.uniqueKey = `${x.type}_${x._id || x.txHash || x.timestamp || `${x.label}_${x.id}`}`;
      return x;
    });

  }, [
    authenticated,
    failedTransactions,
    getActivityConfig,
    pendingTransactions,
    plannedItems,
    randomEventItems,
    readyItems,
    unreadyItems
  ]);

  // TODO: clear timers in the serviceworker
  //  for not yet ready to finish, set new timers based on time remaining

  // without memoizing, triggers as if new value on every syncedTime update
  const contextValue = useMemo(() => ({
    allVisibleItems,
    pendingTransactions,
    failedTransactions,
    randomEventItems,
    readyItems,
    plannedItems,
    unreadyItems,
    actionItems,
    isLoading: actionItemsLoading || plannedBuildingsLoading
  }), [
    allVisibleItems,
    pendingTransactions,
    failedTransactions,
    randomEventItems,
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
  //         isReady: syncedTime >= event.returnValues.finishTime,
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
  //       const readyIn = (ai.returnValues.finishTime - syncedTime) + 5;
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