import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Building } from '@influenceth/sdk';
import cloneDeep from 'lodash/cloneDeep';

import { CrewBusyIcon } from '~/components/AnimatedIcons';
import { WELCOME_CONFIG } from '~/game/interface/hud/WelcomeTour';
import useSession from '~/hooks/useSession';
import useCrewAgreements from '~/hooks/useCrewAgreements';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useStore from '~/hooks/useStore';
import useCrewBuildings from '~/hooks/useCrewBuildings';
import useBusyActivity from '~/hooks/useBusyActivity';
import { hydrateActivities } from '~/lib/activities';
import api from '~/lib/api';

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
  const { data: busyActivity } = useBusyActivity(crew);
  const { data: crewAgreements, isLoading: agreementsLoading } = useCrewAgreements();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();

  const crewId = crew?.id;
  const { data: actionItems, isLoading: actionItemsLoading, dataUpdatedAt: itemsUpdatedAt } = useQuery(
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
    { enabled: !!crewId && crewId !== WELCOME_CONFIG.crewId }
  );

  const { data: crewBuildings, isLoading: plannedBuildingsLoading, dataUpdatedAt: plansUpdatedAt } = useCrewBuildings();
  const plannedBuildings = useMemo(() => {
    return crewBuildings
      ? (crewBuildings || []).filter((a) => a.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED)
      : undefined;
  }, [crewBuildings, plansUpdatedAt]);

  const welcomeTour = useStore((s) => s.getWelcomeTour());
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

    const sequencedItems = (actionItems || [])
      .filter((a) => a._startTime && a._startTime > blockTime)
      .sort((a, b) => a._startTime - b._startTime);

    // calculate busyItem
    let busyItem = null;
    if (crew && !crew?._ready && busyActivity) {
      const tmpBusyActivity = cloneDeep(busyActivity); // make writeable

      // virtual busy item
      const virtualItem = getActivityConfig(tmpBusyActivity)?.busyItem;
      if (virtualItem) {
        busyItem = {
          ...tmpBusyActivity,
          _preformatted: {
            icon: virtualItem.icon,
            label: virtualItem.label,
            asteroidId: crew?._location?.asteroidId,
            lotId: crew?._location?.lotId,
            shipId: crew?._location?.shipId,
          }
        };

      // crew time > task time busy item
      } else if (getActivityConfig(tmpBusyActivity)?.actionItem) {
        busyItem = {
          ...tmpBusyActivity,
          _preformatted: {
            icon: <CrewBusyIcon />,
            label: 'Return to Station',
            asteroidId: crew?._location?.asteroidId,
            lotId: crew?._location?.lotId,
            shipId: crew?._location?.shipId,
          }
        };
        try { busyItem.event.name = `_${busyItem.event.name}`; } catch {}
      }

      // best guess at startTime and finishTime for current action
      if (busyItem?.event?.returnValues) {
        busyItem._startTime = busyItem.event.timestamp;
        busyItem.event.returnValues.finishTime = sequencedItems[0]
          ? sequencedItems[0]._startTime
          : crew?.Crew.readyAt;
      }
    }

    setReadyItems(
      (actionItems || [])
        .filter((a) => a.event.name === 'DeliveryPackaged' || a.event.returnValues?.finishTime <= blockTime)
        .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime)
    );

    // item has a finishTime that has not passed AND has no startTime or a startTime that has passed
    const unreadyFinishableItems = (actionItems || [])
      .filter((a) => a.event.returnValues?.finishTime > blockTime && (!a._startTime || a._startTime <= blockTime))
      .sort((a, b) => a.event.returnValues?.finishTime - b.event.returnValues?.finishTime);
    setUnreadyItems(unreadyFinishableItems?.length > 0 ? unreadyFinishableItems : (busyItem ? [busyItem] : []));

    setUnstartedItems(sequencedItems);

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
  }, [actionItems, busyActivity, crew, crew?._ready, crewAgreements, plannedBuildings, blockTime, itemsUpdatedAt, plansUpdatedAt]);

  const allVisibleItems = useMemo(() => {
    if (!(authenticated || welcomeTour)) return [];

    // return the readyItems whose "finishing transaction" is not already pending
    const visibleReadyItems = (readyItems || []).filter((item) => {
      if (pendingTransactions) {
        return !getActivityConfig(item)?.isActionItemHidden(pendingTransactions);
      }
      return true;
    });

    const visiblePlannedItems = (plannedItems || []).filter((item) => {
      if (pendingTransactions) {
        return !pendingTransactions.find((tx) => (
          ['ConstructionStart', 'ConstructionAbandon'].includes(tx.key)
          && tx.vars.building.id === item.id
        ));
      }
      return true;
    });

    const visibleAgreementItems = (agreementItems || []).filter((item) => {
      if (pendingTransactions) {
        return !pendingTransactions.find((tx) => (
          ['AcceptPrepaidAgreement', 'ExtendPrepaidAgreement'].includes(tx.key)
          && tx.vars.target.id === item.id
          && tx.vars.target.label === item.label
          && tx.vars.permission === item._agreement?.permission
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
      ...(visibleAgreementItems || []).map((item) => ({ ...item, type: 'agreement', category: 'warning' })),
      ...(unreadyItems || []).map((item) => ({ ...item, type: 'unready', category: 'unready' })),
      ...(unstartedItems || []).map((item) => ({ ...item, type: 'unstarted', category: 'unstarted' }))
    ].map((x) => {  // make sure everything has a unique key (only `plan` should fall through to the label_id option)
      x.uniqueKey = `${x.type}_${x._id || x.txHash || x.timestamp || x.key || `${x.label}_${x.id}`}`;
      x.hidden = (hiddenActionItems || []).includes(x.uniqueKey);
      return x;
    });

  }, [
    authenticated,
    welcomeTour,
    failedTransactions,
    getActivityConfig,
    hiddenActionItems,
    pendingTransactions,
    plannedItems,
    randomEventItems,
    readyItems,
    unreadyItems,
    unstartedItems,
    plansUpdatedAt
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
  }, [actionItems, allVisibleItems, crewAgreements, hiddenActionItems, plannedBuildings, itemsUpdatedAt, plansUpdatedAt])

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
    plannedBuildingsLoading,
    itemsUpdatedAt,
    plansUpdatedAt
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