import { useCallback, useContext, useMemo } from 'react';
import { Delivery, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useBlockTime from '~/hooks/useBlockTime';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveries from '~/hooks/useDeliveries';
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
  const { actionItems, readyItems } = useActionItems();
  const blockTime = useBlockTime();
  const { execute, getStatus, getPendingTx } = useContext(ChainTransactionContext);
  const { crew, pendingTransactions } = useCrewContext();

  const { data: deliveries, isLoading } = useDeliveries({ destination, destinationSlot, origin, originSlot, deliveryId, incomplete: true });

  const payload = useMemo(() => ({
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [crew?.id]);

  const pendingDeliveries = useMemo(() => {
    return pendingTransactions.filter(({ key, vars }) => (
      (key === 'SendDelivery' || key === 'PackageDelivery')
      && (
        (!destination || (vars.dest.label === destination.label && vars.dest.id === destination.id))
        && (!destinationSlot || vars.dest_slot === destinationSlot)
        && (!origin || (vars.origin.label === origin.label && vars.origin.id === origin.id))
        && (!originSlot || vars.origin_slot === originSlot)
      )
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
        _originLot: null,
        caller: null,
        deliveryId: null,
        dest: null,
        destSlot: null,
        isProposal: false,
        origin: null,
        originSlot: null,
        contents: null,
        startTime: null,
        status: Delivery.STATUSES.IN_PROGRESS,
        finishTime: null,
      };

      // status flow
      // READY > (PACKAGING > PACKAGED) > DEPARTING > IN_TRANSIT > READY_TO_FINISH > FINISHING > FINISHED
      //       < (CANCELING <         )
      let status = 'READY';
      let stage = actionStages.NOT_STARTED;

      // if deliveryId, treat lot as destination and assume in progress or done
      if (delivery.id > 0) {
        let actionItem = (actionItems || []).find((item) => item.event.name === 'DeliverySent' && item.event.returnValues.delivery.id === delivery.id);
        if (actionItem) {
          // current._crewmates = actionItem.assets.crew?.crewmates;  // TODO: ...
          current._originLot = actionItem.data.origin?.Location.locations.find((l) => l.label === Entity.IDS.LOT);
          current.startTime = actionItem.event.timestamp;
        } else {
          actionItem = (actionItems || []).find((item) => item.event.name === 'DeliveryPackaged' && item.event.returnValues.delivery.id === delivery.id);
          if (actionItem) {
            // current._crewmates = actionItem.assets.crew?.crewmates;  // TODO: ...
            current.caller = actionItem.event.returnValues.caller;
            current.price = actionItem.event.returnValues.price;
            current.startTime = actionItem.event.timestamp;
            current.isProposal = true;
          }
        }
        current.deliveryId = delivery.id;
        current.dest = delivery.Delivery.dest;
        current.destSlot = delivery.Delivery.destSlot;
        current.origin = delivery.Delivery.origin;
        current.originSlot = delivery.Delivery.originSlot;
        current.contents = delivery.Delivery.contents;
        current.finishTime = current.isProposal ? current.startTime : delivery.Delivery.finishTime;
        current.status = delivery.Delivery.status;

        if (delivery.Delivery.status === Delivery.STATUSES.COMPLETE) {
          status = 'FINISHED';
          stage = actionStages.COMPLETED;
        } else {
          if (getStatus('AcceptDelivery', { ...payload, delivery: { id: delivery.id, label: Entity.IDS.DELIVERY } }) === 'pending') {
            status = 'DEPARTING';
            stage = actionStages.STARTING;
          } else if (getStatus('CancelDelivery', { ...payload, delivery: { id: delivery.id, label: Entity.IDS.DELIVERY } }) === 'pending') {
            status = 'CANCELING';
            stage = actionStages.STARTING;
          } else if (getStatus('ReceiveDelivery', { ...payload, delivery: { id: delivery.id, label: Entity.IDS.DELIVERY } }) === 'pending') {
            status = 'FINISHING';
            stage = actionStages.COMPLETING;
          } else if (current.isProposal) {
            status = 'PACKAGED';
            stage = actionStages.READY_TO_COMPLETE;
          } else if (delivery.Delivery.finishTime && delivery.Delivery.finishTime <= blockTime) {
            status = 'READY_TO_FINISH';
            stage = actionStages.READY_TO_COMPLETE;
          } else {
            status = 'IN_TRANSIT';
            stage = actionStages.IN_PROGRESS;
          }
        }

      // if no deliveryId yet, must be the pending start / package
      } else {
        current.dest = delivery.vars.dest;
        current.destSlot = delivery.vars.dest_slot;
        current.origin = delivery.vars.origin;
        current.originSlot = delivery.vars.origin_slot;
        current.contents = delivery.vars.products.map((p) => ({ product: Number(p.product), amount: p.amount }));
        current.price = delivery.vars.price;
        current.txHash = delivery.txHash;
        current.isProposal = (delivery.key === 'PackageDelivery');
        status = current.isProposal ? 'PACKAGING' : 'DEPARTING';
        stage = actionStages.STARTING;
      }

      return {
        action: current,  // TODO? status === 'READY' ? null : current,
        status,
        stage
      };
    });
    return [allDeliveries, Date.now()];
  }, [blockTime, deliveries, pendingDeliveries, getStatus, payload]);

  const acceptDelivery = useCallback((selectedDeliveryId, meta) => {
    const delivery = currentDeliveries.find((d) => d.action.deliveryId === selectedDeliveryId);
    if (!delivery?.action) return;
    execute(
      'AcceptDelivery',
      {
        caller: delivery.action.caller,
        price: delivery.action.price,
        delivery: { id: selectedDeliveryId || deliveryId, label: Entity.IDS.DELIVERY },
        ...payload,
      },
      meta
    );
  }, [currentDeliveries, payload]);

  const cancelDelivery = useCallback((selectedDeliveryId, meta) => {
    execute(
      'CancelDelivery',
      {
        delivery: { id: selectedDeliveryId || deliveryId, label: Entity.IDS.DELIVERY },
        ...payload,
      },
      meta
    );
  }, [payload]);

  const packageDelivery = useCallback(({ origin, originSlot, destination, destinationSlot, contents, price }, meta) => {
    execute(
      'PackageDelivery',
      {
        origin,
        origin_slot: originSlot,
        products: Object.keys(contents).map((product) => ({ product, amount: Math.floor(contents[product]) })),
        dest: destination,
        dest_slot: destinationSlot,
        price: price * 1e6,
        ...payload,
      },
      meta
    );
  }, [payload]);

  const startDelivery = useCallback(({ origin, originSlot, destination, destinationSlot, contents }, meta) => {
    execute(
      'SendDelivery',
      {
        origin,
        origin_slot: originSlot,
        products: Object.keys(contents).map((product) => ({ product, amount: Math.floor(contents[product]) })),
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

    acceptDelivery,
    cancelDelivery,
    packageDelivery,
    startDelivery,
    finishDelivery
  };
};

export default useDeliveryManager;
