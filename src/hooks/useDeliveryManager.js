import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Extraction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import useActionItems from './useActionItems';

const useDeliveryManager = (asteroidId, originPlotId, originInvId, destPlotId, destInvId) => {
  const actionItems = useActionItems();
  const { chainTime, execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: originPlot } = usePlot(asteroidId, originPlotId);
  const { data: destinationPlot } = usePlot(asteroidId, destPlotId);

  const payload = useMemo(() => ({
    asteroidId,
    destPlotId,
    destInvId,
    crewId: crew?.i
  }), [asteroidId, destPlotId, destInvId, crew?.i]);

  // start delivery:
  //  - button loading
  //  - actionItem (transaction) links back to origin and opens delivery

  // once started, only accessible via actionItem
  //  - no buttons loading
  //  - actionItem links to destination and opens delivery
  






  // status flow
  // READY > IN_TRANSIT > READY_TO_FINISH > FINISHING
  const [currentConstruction, constructionStatus] = useMemo(() => {
    // TODO: this needs a status filter
    if (unfinishedCrewDelivery) {
      if (getStatus('FINISH_DELIVERY', { ...payload, deliveryId: unfinishedCrewDelivery?.deliveryId }) === 'pending') {
        return 'FINISHING';
      } else if (unfinishedCrewDelivery.completionTime < chainTime) {
        return 'READY_TO_FINISH';
      }
      return 'IN_TRANSIT';
    } else if (getStatus('START_DELIVERY', payload) === 'pending') {
      return 'IN_TRANSIT';
    }
    return 'READY';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from UNDER_CONSTRUCTION to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  }, [unfinishedCrewDelivery, getStatus, payload, actionItems]);


  const startDelivery = useCallback((resources) => {
    execute('START_DELIVERY', {
      ...payload,
      originPlotId,
      originInvId,
      resources
    })
  }, [payload]);

  const unfinishedCrewDelivery = useMemo(() => 
    destinationPlot?.building?.deliveries?.length > 0
      ? destinationPlot.building.deliveries[destinationPlot.building.deliveries.length - 1]
      : null,
    [destinationPlot?.building?.deliveries]
  );

  const finishDelivery = useCallback(() => {
    execute('FINISH_DELIVERY', { ...payload, deliveryId: unfinishedCrewDelivery?.deliveryId })
  }, [payload, unfinishedCrewDelivery]);

  return {
    deliveryStatus: 'READY',
    startDelivery,
    finishDelivery
  };
};

export default useDeliveryManager;
