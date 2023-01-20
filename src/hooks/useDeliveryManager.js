import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Extraction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import useActionItems from './useActionItems';

const useDeliveryManager = (asteroidId, plotId, deliveryId = 0) => {
  const { actionItems, readyItems } = useActionItems();
  const { chainTime, execute, getStatus, getPendingTx } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const payload = useMemo(() => ({
    asteroidId,
    crewId: crew?.i
  }), [asteroidId, crew?.i]);


  // if deliveryId is 0, treat plotId as origin
  // else, treat as destination

  // start delivery:
  //  - button loading
  //  - actionItem (transaction) links back to origin and opens delivery

  // once started, only accessible via actionItem
  //  - no buttons loading
  //  - actionItem links to destination and opens delivery
  


  // status flow
  // READY > DEPARTING > IN_TRANSIT > READY_TO_FINISH > FINISHING > FINISHED
  const [currentDelivery, deliveryStatus] = useMemo(() => {
    let current = {
      _crewmates: null,
      completionTime: null,
      destPlotId: null,
      destPlotInvId: null,
      originPlotId: null,
      originPlotInvId: null,
      resources: null,
      startTime: null
    };

    let status = 'READY';

    // if deliveryId, treat plot as destination and asssume in progress or done
    const delivery = deliveryId > 0 && (plot?.building?.deliveries || []).find((d) => d.deliveryId === deliveryId);
    if (delivery) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_InventoryTransferStart'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.destinationLotId === plotId
        && item.assets.delivery?.deliveryId === deliveryId
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew?.crewmates;
        current.originPlotId = actionItem.event.returnValues.originLotId;
        current.originPlotInvId = actionItem.event.returnValues.originInventoryId;
      }
      current.completionTime = delivery.completionTime;
      current.destPlotId = plot.i;
      current.destPlotInvId = delivery.inventoryType;
      current.resources = delivery.resources;
      current.startTime = delivery.startTime;

      if (delivery.status === 'COMPLETE') {
        status = 'FINISHED';
      } else {
        if(getStatus('FINISH_DELIVERY', { ...payload, destPlotId: plotId, deliveryId }) === 'pending') {
          status = 'FINISHING';
        } else if (delivery.completionTime && delivery.completionTime < chainTime) {
          status = 'READY_TO_FINISH';
        } else {
          status = 'IN_TRANSIT';
        }
      }

    // if no deliveryId (or no delivery), treat plot as origin (and assume delivery not yet started or in new tx)
    } else {
      const startTx = getPendingTx('START_DELIVERY', { ...payload, originPlotId: plotId, });
      if (startTx) {
        current.destPlotId = startTx.vars.destPlotId;
        current.destPlotInvId = startTx.vars.destInvId;
        current.originPlotId = startTx.vars.originPlotId;
        current.originPlotInvId = startTx.vars.originInvId;
        current.resources = startTx.vars.resources;
        status = 'DEPARTING';
      }
    }

    return [
      status === 'READY' ? null : current,
      status
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, deliveryId]);


  const startDelivery = useCallback(({ originInvId, destPlotId, destInvId, resources }) => {
    execute('START_DELIVERY', {
      ...payload,
      originPlotId: plotId,
      originInvId,
      destPlotId,
      destInvId,
      resources
    })
  }, [payload]);

  const finishDelivery = useCallback(() => {
    execute('FINISH_DELIVERY', {
      ...payload,
      destPlotId: currentDelivery?.destPlotId,
      destInvId: currentDelivery?.destPlotInvId,
      deliveryId
    })
  }, [payload, currentDelivery]);

  return {
    startDelivery,
    finishDelivery,
    deliveryStatus,
    currentDelivery,
  };
};

export default useDeliveryManager;
