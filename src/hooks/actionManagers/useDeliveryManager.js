import { useCallback, useContext, useMemo } from 'react';
import { Delivery, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveries from '~/hooks/useDeliveries';
import useStore from '~/hooks/useStore';
import actionStages from '~/lib/actionStages';

// start delivery:
//  - button loading
//  - actionItem (transaction) links back to origin and opens delivery

// once started, only accessible via actionItem
//  - no buttons loading
//  - actionItem links to destination and opens delivery

// { destination, destinationSlot, origin, originSlot, deliveryId }
// must include destination OR origin OR deliveryId
// if more input is included, will filter to those results
const useDeliveryManager = ({ destination, destinationSlot, origin, originSlot, deliveryId }) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getStatus, getPendingTx } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();

  const { data: deliveries, isLoading } = useDeliveries({ destination, destinationSlot, origin, originSlot, deliveryId, incomplete: true });

  const pendingTransactions = useStore(s => s.pendingTransactions);

  const payload = useMemo(() => ({
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [crew?.id]);

  const pendingDeliveries = useMemo(() => {
    return pendingTransactions.filter(({ key, vars }) => key === 'SendDelivery' && (
      (!destination || (vars.dest.label === destination.label && vars.dest.id === destination.id))
      && (!destinationSlot || vars.dest_slot === destinationSlot)
      && (!origin || (vars.origin.label === origin.label && vars.origin.id === origin.id))
      && (!originSlot || vars.origin_slot === originSlot)
    ));
  }, [destination, destinationSlot, origin, originSlot, pendingTransactions]);

  const [currentDeliveries, currentDeliveriesVersion] = useMemo(() => {
    const active = [...(deliveries || [])];
    // TODO: filter by crew
    // TODO: filter by incomplete
    if (pendingDeliveries) active.push(...pendingDeliveries);
    const allDeliveries = active.map((delivery) => {
      let current = {
        _crewmates: null,
        deliveryId: null,
        dest: null,
        destSlot: null,
        origin: null,
        originSlot: null,
        contents: null,
        startTime: null,
        status: Delivery.STATUSES.IN_PROGRESS,
        finishTime: null,
      };
  
      // status flow
      // READY > DEPARTING > IN_TRANSIT > READY_TO_FINISH > FINISHING > FINISHED
      let status = 'READY';
      let stage = actionStages.NOT_STARTED;
  
      // if deliveryId, treat lot as destination and assume in progress or done
      if (delivery.id > 0) {
        let actionItem = (actionItems || []).find((item) => item.event.name === 'DeliverySent' && item.event.returnValues.delivery.id === delivery.id);
        if (actionItem) {
          // current._crewmates = actionItem.assets.crew?.crewmates;  // TODO: ...
          current.startTime = actionItem.event.timestamp;
        }
        current.deliveryId = delivery.id;
        current.dest = delivery.Delivery.dest;
        current.destSlot = delivery.Delivery.destSlot;
        current.origin = delivery.Delivery.origin;
        current.originSlot = delivery.Delivery.originSlot;
        current.contents = delivery.Delivery.contents;
        current.finishTime = delivery.Delivery.finishTime;
        current.status = delivery.Delivery.status;
  
        if (delivery.Delivery.status === Delivery.STATUSES.COMPLETE) {
          status = 'FINISHED';
          stage = actionStages.COMPLETED;
        } else {
          if(getStatus('ReceiveDelivery', { ...payload, delivery: { id: delivery.id, label: Entity.IDS.DELIVERY } }) === 'pending') {
            status = 'FINISHING';
            stage = actionStages.COMPLETING;
          } else if (delivery.Delivery.finishTime && delivery.Delivery.finishTime <= liveBlockTime) {
            status = 'READY_TO_FINISH';
            stage = actionStages.READY_TO_COMPLETE;
          } else {
            status = 'IN_TRANSIT';
            stage = actionStages.IN_PROGRESS;
          }
        }
  
      // if no deliveryId yet, must be the pending start
      } else {
        current.dest = delivery.vars.dest;
        current.destSlot = delivery.vars.dest_slot;
        current.origin = delivery.vars.origin;
        current.originSlot = delivery.vars.origin_slot;
        current.contents = delivery.vars.products.map((p) => ({ product: Number(p.product), amount: p.amount }));
        current.txHash = delivery.txHash;
        status = 'DEPARTING';
        stage = actionStages.STARTING;
      }
  
      return {
        action: current,  // TODO? status === 'READY' ? null : current,
        status,
        stage
      };
    });
    return [allDeliveries, Date.now()];
  }, [deliveries, pendingDeliveries, getStatus, payload]);

  const startDelivery = useCallback(({ origin, originSlot, destination, destinationSlot, contents }, meta) => {
    execute(
      'SendDelivery',
      {
        origin,
        origin_slot: originSlot,
        products: Object.keys(contents).map((product) => ({ product, amount: contents[product] })),
        dest: destination,
        dest_slot: destinationSlot,
        ...payload,
      },
      meta
    );
  }, [payload]);

  const finishDelivery = useCallback((selectedDeliveryId, meta) => {
    execute(
      'ReceiveDelivery',
      {
        delivery: { id: selectedDeliveryId || deliveryId, label: Entity.IDS.DELIVERY },
        ...payload
      },
      meta
    )
  }, [payload, deliveryId]);

  return {
    isLoading,
    currentDeliveryActions: currentDeliveries,
    currentVersion: currentDeliveriesVersion,
    startDelivery,
    finishDelivery
  };
};

export default useDeliveryManager;
