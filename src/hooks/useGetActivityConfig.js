import { useMemo } from 'react';
import { useQueryClient } from 'react-query';

import activities, { getHydrationQueryKey } from '~/lib/activities';

const getActivityConfig = (queryClient) => (activity, viewingAs = {}) => {
  const name = activity?.event?.name || activity?.event?.event;
  if (!activities[name]) {
    console.warn(`No activity config for ${name}`);
    return null;
  }

  const config = activities[name];
  if (!config) console.warn(`No activity config found for "${name}"!`);

  const prepopEntities = config.getPrepopEntities ? config.getPrepopEntities(activity) : {};
  const prepopped = Object.keys(prepopEntities).reduce((acc, prepopKey) => {
    if (!prepopEntities[prepopKey]) return acc;
    return {
      ...acc,
      [prepopKey]: queryClient.getQueryData(getHydrationQueryKey(prepopEntities[prepopKey]))
    };
  }, {});

  const actionItem = config?.getActionItem ? config.getActionItem(activity.event, prepopped) : null;

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
  return useMemo(() => getActivityConfig(queryClient), [queryClient]);
}

export default useGetActivityConfig;