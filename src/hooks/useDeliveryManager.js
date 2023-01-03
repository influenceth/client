import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Extraction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { getAdjustedNow } from '~/lib/utils';
import useActionItems from './useActionItems';

const useDeliveryManager = (asteroidId, originPlotId, originInvId, destPlotId, destInvId) => {
  const actionItems = useActionItems();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: originPlot } = usePlot(asteroidId, originPlotId);
  const { data: destinationPlot } = usePlot(asteroidId, destPlotId);

  const payload = useMemo(() => ({
    asteroidId,
    destPlotId,
    destInvId,
    crewId: crew?.i
  }), [asteroidId, destPlotId, destInvId, crew?.i]);

  const startDelivery = useCallback((resources) => {
    execute('START_DELIVERY', {
      ...payload,
      originPlotId,
      originInvId,
      resources
    })
  }, [payload]);

  const finishDelivery = useCallback((deliveryId) => {
    execute('FINISH_DELIVERY', { ...payload, deliveryId })
  }, [payload]);

  // status flow
  // READY > IN_TRANSIT > READY_TO_FINISH > FINISHING
  const deliveryStatus = useMemo(() => {
    // TODO: this needs a status filter
    const unfinishedCrewDelivery = originPlot?.building?.deliveries?.length > 0
      ? originPlot.building.deliveries[originPlot.building.deliveries.length - 1]
      : null;
    if (unfinishedCrewDelivery) {
      if (getStatus('FINISH_DELIVERY', payload) === 'pending') {
        return 'FINISHING';
      } else if (unfinishedCrewDelivery.committedTime < getAdjustedNow()) {
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
  }, [originPlot?.building?.deliveries, getStatus, payload, actionItems]);

  return {
    deliveryStatus,
    startDelivery,
    finishDelivery
  };
};

export default useDeliveryManager;
