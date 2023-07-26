import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import actionStages from '~/lib/actionStages';
import useCrewContext from './useCrewContext';
import useLot from './useLot';
import useActionItems from './useActionItems';

// start delivery:
//  - button loading
//  - actionItem (transaction) links back to origin and opens delivery

// once started, only accessible via actionItem
//  - no buttons loading
//  - actionItem links to destination and opens delivery

const useDeliveryManager = (asteroidId, lotId, deliveryId = 0) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getStatus, getPendingTx } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(asteroidId, lotId);

  const payload = useMemo(() => ({
    asteroidId,
    crewId: crew?.i
  }), [asteroidId, crew?.i]);

  // status flow
  // READY > DEPARTING > IN_TRANSIT > READY_TO_FINISH > FINISHING > FINISHED
  const [currentDelivery, deliveryStatus, actionStage] = useMemo(() => {
    let current = {
      _crewmates: null,
      completionTime: null,
      destLotId: null,
      destLotInvId: null,
      originLotId: null,
      originLotInvId: null,
      resources: null,
      startTime: null
    };

    let status = 'READY';
    let stage = actionStages.NOT_STARTED;

    // if deliveryId, treat lot as destination and assume in progress or done
    const delivery = deliveryId > 0 && (lot?.building?.deliveries || []).find((d) => d.deliveryId === deliveryId);
    if (delivery) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_InventoryTransferStart'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.destinationLotId === lotId
        && item.assets.delivery?.deliveryId === deliveryId
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew?.crewmates;
        current.originLotId = actionItem.event.returnValues.originLotId;
        current.originLotInvId = actionItem.event.returnValues.originInventoryId;
      }
      current.completionTime = delivery.completionTime;
      current.destLotId = lot.i;
      current.destLotInvId = delivery.inventoryType;
      current.resources = delivery.resources;
      current.startTime = delivery.startTime;

      if (delivery.status === 'COMPLETE') {
        status = 'FINISHED';
        stage = actionStages.COMPLETED;
      } else {
        if(getStatus('FINISH_DELIVERY', { ...payload, destLotId: lotId, deliveryId }) === 'pending') {
          status = 'FINISHING';
          stage = actionStages.COMPLETING;
        } else if (delivery.completionTime && delivery.completionTime <= liveBlockTime) {
          status = 'READY_TO_FINISH';
          stage = actionStages.READY_TO_COMPLETE;
        } else {
          status = 'IN_TRANSIT';
          stage = actionStages.IN_PROGRESS;
        }
      }

    // if no deliveryId (or no delivery), treat lot as origin (and assume delivery not yet started or in new tx)
    } else {
      const startTx = getPendingTx('START_DELIVERY', { ...payload, originLotId: lotId, });
      if (startTx) {
        current.destLotId = startTx.vars.destLotId;
        current.destLotInvId = startTx.vars.destInvId;
        current.originLotId = startTx.vars.originLotId;
        current.originLotInvId = startTx.vars.originInvId;
        current.resources = startTx.vars.resources;
        status = 'DEPARTING';
        stage = actionStages.STARTING;
      }
    }

    return [
      status === 'READY' ? null : current,
      status,
      stage
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, deliveryId]);


  const startDelivery = useCallback(({ originInvId, destLotId, destInvId, resources }) => {
    execute('START_DELIVERY', {
      ...payload,
      originLotId: lotId,
      originInvId,
      destLotId,
      destInvId,
      resources
    })
  }, [payload]);

  const finishDelivery = useCallback(() => {
    execute('FINISH_DELIVERY', {
      ...payload,
      destLotId: currentDelivery?.destLotId,
      destInvId: currentDelivery?.destLotInvId,
      deliveryId
    })
  }, [payload, currentDelivery]);

  return {
    startDelivery,
    finishDelivery,
    deliveryStatus,
    currentDelivery,
    actionStage,
  };
};

export default useDeliveryManager;
