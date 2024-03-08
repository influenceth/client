import { useMemo } from 'react';
import { useQueryClient } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import activities, { getHydrationQueryKey } from '~/lib/activities';

const getActivityConfig = (queryClient, defaultViewingAs) => (activity, overrideViewingAs) => {
  const name = activity?.event?.name || activity?.event?.event;
  const config = activities[name];
  if (!config) {
    console.warn(`No activity config found for "${name}"!`, activity);
    return null;
  }

  const prepopEntities = config.getPrepopEntities ? config.getPrepopEntities(activity) : {};
  const prepopped = Object.keys(prepopEntities).reduce((acc, prepopKey) => {
    if (!prepopEntities[prepopKey]) return acc;
    return {
      ...acc,
      [prepopKey]: queryClient.getQueryData(getHydrationQueryKey(prepopEntities[prepopKey]))
    };
  }, {});

  const viewingAs = overrideViewingAs || defaultViewingAs || {};

  const actionItem = config?.getActionItem ? config.getActionItem(activity.event, viewingAs, prepopped) : null;

  const invalidations = config?.getInvalidations ? config.getInvalidations(activity, prepopped) : [];

  const logContent = config?.getLogContent ? config.getLogContent(activity, viewingAs, prepopped) : null;
  if (logContent && activity.event.transactionHash) logContent.txLink = `${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${activity.event.transactionHash}`;
  // TODO: support L1? __t is in event record, but is not included in activity record...
  //  `${process.env.REACT_APP_ETHEREUM_EXPLORER_URL}/tx/${activity.event?.transactionHash}`

  const requiresCrewTime = !!config?.requiresCrewTime;

  const triggerAlert = !!config?.triggerAlert;

  const isActionItemHidden = (pendingTransactions, prepopped) => {
    return config?.getIsActionItemHidden
      ? config.getIsActionItemHidden(activity.event, prepopped)(pendingTransactions)
      : () => false;
  };

  return {
    actionItem,
    invalidations,
    logContent,
    isActionItemHidden,
    requiresCrewTime,
    triggerAlert
  };
}

const useGetActivityConfig = () => {
  const queryClient = useQueryClient();
  const { crew } = useCrewContext();
  return useMemo(() => getActivityConfig(queryClient, { id: crew?.id, label: crew?.label, uuid: crew?.uuid }), [crew?.id, queryClient]);
}

export default useGetActivityConfig;