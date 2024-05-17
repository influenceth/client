import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Building, Entity } from '@influenceth/sdk';
import cloneDeep from 'lodash/cloneDeep';

import useSession from '~/hooks/useSession';
import useCrewAgreements from '~/hooks/useCrewAgreements';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useStore from '~/hooks/useStore';
import useWalletBuildings from '~/hooks/useWalletBuildings';
import api from '~/lib/api';
import { hydrateActivities } from '~/lib/activities';

const ActionItemContext = React.createContext();

const sequenceableSystems = [
  'ConstructionStarted',
  'MaterialProcessingStarted',
  'ResourceExtractionStarted',
  'SamplingDepositStarted',
  'ShipAssemblyStarted'
];

export function ActionItemProvider({ children }) {
  const { authenticated, blockTime } = useSession();
  const { crew, pendingTransactions } = useCrewContext();
  const { data: crewAgreements, isLoading: agreementsLoading } = useCrewAgreements();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();

  const crewId = crew?.id;
  const { data: actionItems, isLoading: actionItemsLoading } = useQuery(
    [ 'actionItems', crewId ],
    async () => {
      const activities = await api.getCrewActionItems(crewId);
      
      // add startTime to all for consistency
      activities.forEach((a) => {
        if (sequenceableSystems.includes(a.event.name)) {
          if (a.data?.crew?.Crew?.lastReadyAt > a.event?.timestamp) {
            a._startTime = a.data?.crew?.Crew?.lastReadyAt;
          }
        }
      });

      await hydrateActivities(activities, queryClient);
      return activities;
    },
    { enabled: !!crewId }
  );

  const { data: walletBuildings, isLoading: plannedBuildingsLoading } = useWalletBuildings();
  const plannedBuildings = useMemo(() => {
    return walletBuildings && crewId
      ? (walletBuildings.hits || []).filter((a) => (
        a.Control?.controller?.id === crewId
        && a.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED
      ))
      : undefined;
  }, [crewId, walletBuildings]);

  const failedTransactions = useStore(s => s.failedTransactions);
  const hiddenActionItems = useStore(s => s.hiddenActionItems);
  const dispatchToggleHideActionItem = useStore(s => s.dispatchToggleHideActionItem);
  const [readyItems, setReadyItems] = useState([]);
  const [unreadyItems, setUnreadyItems] = useState([]);
  const [unstartedItems, setUnstartedItems] = useState([]);
  const [agreementItems, setAgreementItems] = useState([]);
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
        .filter((a) => a.event.returnValues?.finishTime > blockTime && (!a._startTime || a._startTime <= blockTime))
        .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime)
    );

    setUnstartedItems(
      (actionItems || [])
        .filter((a) => a._startTime && a._startTime > blockTime)
        .sort((a, b) => a._startTime - b._startTime)
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

    setAgreementItems(
      (crewAgreements || [])
        .filter((a) => (
          ((a._agreement?.permitted?.id === crew?.id) || (crew?.Crew?.delegatedTo && a._agreement?.permitted === crew?.Crew?.delegatedTo))
          && !!a._agreement?.endTime
          && (a._agreement.endTime > blockTime - 7 * 86400) && (a._agreement.endTime < blockTime + 7 * 86400)
        ))
        .map((a) => ({
          ...a,
          waitingFor: a._agreement.endTime > blockTime ? a._agreement.endTime : null
        }))
        .sort((a, b) => a._agreement.endTime - b._agreement.endTime)
    );
  }, [actionItems, crew, crewAgreements, plannedBuildings, blockTime]);

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
      ...(pendingTransactions || []).map((item) => ({ ...item, type: 'pending', category: 'tx' })),
      ...(failedTransactions || []).map((item) => ({ ...item, type: 'failed', category: 'tx' })),
      ...(randomEventItems || []).map((item) => ({ ...item, type: 'randomEvent', category: 'ready' })),
      ...(visibleReadyItems || []).map((item) => ({ ...item, type: 'ready', category: 'ready' })),
      ...(visiblePlannedItems || []).map((item) => ({ ...item, type: 'plan', category: 'warning' })),
      ...(agreementItems || []).map((item) => ({ ...item, type: 'agreement', category: 'warning' })),
      ...(unreadyItems || []).map((item) => ({ ...item, type: 'unready', category: 'unready' })),
      ...(unstartedItems || []).map((item) => ({ ...item, type: 'unstarted', category: 'unstarted' }))
    ].map((x) => {  // make sure everything has a unique key (only `plan` should fall through to the label_id option)
      x.uniqueKey = `${x.type}_${x._id || x.txHash || x.timestamp || x.key || `${x.label}_${x.id}`}`;
      x.hidden = (hiddenActionItems || []).includes(x.uniqueKey);
      return x;
    });

  }, [
    authenticated,
    failedTransactions,
    getActivityConfig,
    hiddenActionItems,
    pendingTransactions,
    plannedItems,
    randomEventItems,
    readyItems,
    unreadyItems,
    unstartedItems
  ]);

  // if there is data for all types (i.e. we know loaded successfully), clean out all
  // hidden keys that no longer exist to minimize long-term state bloat
  useEffect(() => {
    if (allVisibleItems?.length > 0 && actionItems?.length > 0 && crewAgreements?.length > 0 && plannedBuildings?.length > 0) {
      hiddenActionItems.forEach((key) => {
        if (!allVisibleItems.find((i) => i.uniqueKey === key)) {
          dispatchToggleHideActionItem(key);
        }
      })
    }
  }, [actionItems, allVisibleItems, crewAgreements, hiddenActionItems, plannedBuildings])

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
    unstartedItems,
    actionItems,
    isLoading: actionItemsLoading || agreementsLoading || plannedBuildingsLoading
  }), [
    allVisibleItems,
    pendingTransactions,
    failedTransactions,
    randomEventItems,
    readyItems,
    plannedItems,
    unreadyItems,
    unstartedItems,
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