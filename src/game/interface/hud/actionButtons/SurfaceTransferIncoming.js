import { useCallback, useMemo, useRef, useState } from 'react';
import { Inventory, Order, Permission } from '@influenceth/sdk';

import { TransferP2PIcon, TransferToIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useUnresolvedActivities from '~/hooks/useUnresolvedActivities';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { locationsArrToObj } from '~/lib/utils';
import useEntity from '~/hooks/useEntity';
import useBlockTime from '~/hooks/useBlockTime';
import useOrdersByInventory from '~/hooks/useOrdersByInventory';

const isVisible = ({ crew, lot, ship }) => {
  const entity = ship || lot?.surfaceShip || lot?.building;
  return crew && ((entity?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE));
};

const StackButton = ({ delivery, onClick, onSetAction, order, otherAction, ...props }) => {
  const { data: originEntity } = useEntity(
    otherAction?.event?.returnValues?.extractor
    || otherAction?.event?.returnValues?.processor
    || order?.entity
  );

  const handleClick = useCallback(() => {
    if (delivery) {
      onSetAction('SURFACE_TRANSFER', { deliveryId: delivery.action?.deliveryId });
    } else if (order && originEntity) {
      const exchangeLoc = locationsArrToObj(originEntity?.Location?.locations || []);
      onSetAction('MARKETPLACE_ORDER', {
        exchange: originEntity,
        asteroidId: exchangeLoc?.asteroidId,
        lotId: exchangeLoc?.lotId,
        mode: 'buy',
        type: 'limit',
        resourceId: order.product,
        isCancellation: true,
        cancellationMakerFee: order.makerFee,
        preselect: {
          limitPrice: order.price,
          quantity: order.amount,
          storage: order.storage,
          storageSlot: order.storageSlot
        }
      });
    } else if (originEntity) {
      const lotId = locationsArrToObj(originEntity.Location?.locations || [])?.lotId;
      switch(otherAction.event?.name) {
        case 'MaterialProcessingStarted':
          onSetAction('PROCESS', { lotId, processorSlot: otherAction.event?.returnValues?.processorSlot });
          break;
        case 'ResourceExtractionStarted':
          onSetAction('EXTRACT_RESOURCE', { lotId });
          break;
      }
    } else {
      return; // (presumably wait for load)
    }

    if (onClick) onClick();
  }, [delivery, onSetAction, onClick, order, originEntity, otherAction]);

  return (
    <ActionButton
      {...props}
      onClick={handleClick} />
  );
};

const SurfaceTransferIncoming = ({ asteroid, crew, lot, ship, onSetAction, dialogProps = {}, _disabled }) => {
  const blockTime = useBlockTime();
  const destination = useMemo(() => ship || lot?.surfaceShip || lot?.building, [ship, lot]);
  const { data: inventoryOrders } = useOrdersByInventory(destination);
  const { currentDeliveryActions: destDeliveryActions, isLoading } = useDeliveryManager({ destination });
  const { data: destActionItems } = useUnresolvedActivities(destination);

  const deliveryDeparting = useMemo(() => {
    return (destDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [destDeliveryActions]);

  const [clickTally, setClickTally] = useState(0);

  const currentDeliveryStack = useMemo(
    () => {
      const actionStack = [];
      if (Permission.isPermitted(crew, Permission.IDS.ADD_PRODUCTS, destination)) {
        (destDeliveryActions || []).forEach((d) => {
          if (['IN_TRANSIT','READY_TO_FINISH'].includes(d.status)) {
            actionStack.push({ delivery: d })
          }
        });
        (inventoryOrders || []).forEach((o) => {
          if (o.orderType === Order.IDS.LIMIT_BUY) {
            actionStack.push({ order: o });
          }
        });
        (destActionItems || []).forEach((a) => {
          if (['MaterialProcessingStarted', 'ResourceExtractionStarted'].includes(a.event.name)) {
            actionStack.push({ otherAction: a });
          }
        });
      }
      return actionStack;
    },
    [crew, destination, destDeliveryActions, destActionItems, inventoryOrders]
  );

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, destination, ...dialogProps });
  }, [currentDeliveryStack, onSetAction, destination, dialogProps]);

  const disabledReason = useMemo(() => {
    if (!destination) return '';
    const _location = locationsArrToObj(destination.Location?.locations || []);
    if (!_location?.lotId) return 'not on surface';

    const hasCapacity = !!(destination?.Inventories || []).find((i) => {
      if (i.status === Inventory.STATUSES.AVAILABLE) {
        const invConfig = Inventory.getType(i?.inventoryType, crew?._inventoryBonuses) || {};
        const hasMassCapacity = invConfig.massConstraint > ((i.mass || 0) + (i.reservedMass || 0));
        const hasVolumeCapacity = invConfig.volumeConstraint > ((i.volume || 0) + (i.reservedVolume || 0));
        return (hasMassCapacity && hasVolumeCapacity);
      }
    });
    if (!hasCapacity) return 'over capacity';

    return getCrewDisabledReason({ asteroid, crew, requireReady: false });
  }, [destination, crew]);

  const [stackAttention, stackTime] = useMemo(() => {
    return [
      currentDeliveryStack
        .find((a) => a.delivery?.status === 'READY_TO_FINISH'
          || a.otherAction?.event?.returnValues?.finishTime <= blockTime),
      currentDeliveryStack[0]?.delivery?.action?.finishTime
    ];
  }, [blockTime, currentDeliveryStack]);
  
  const isP2P = useMemo(() => !Permission.isPermitted(crew, Permission.IDS.ADD_PRODUCTS, destination), [crew, destination]);

  return (
    <>
      {currentDeliveryStack.length > 0 && (
        <StackButton
          {...currentDeliveryStack[clickTally % currentDeliveryStack?.length]}
          label={
            currentDeliveryStack.length > 1
            ? `${currentDeliveryStack.length} Incoming Deliver${currentDeliveryStack.length === 1 ? 'y' : 'ies'}`
            : `Receive Delivery`
          }
          flags={{
            attention: stackAttention,
            loading: !stackAttention,
            tally: currentDeliveryStack.length,
            finishTime: currentDeliveryStack.length > 1 ? undefined : stackTime
          }}
          icon={<TransferToIcon />}
          onClick={() => setClickTally((c) => c + 1)}
          onSetAction={onSetAction}
        />
      )}
      <ActionButton
        label="Send To"
        labelAddendum={disabledReason}
        flags={{
          disabled: _disabled || disabledReason || isLoading,
          loading: deliveryDeparting
        }}
        icon={isP2P ? <TransferP2PIcon /> : <TransferToIcon />}
        onClick={handleClick} />
    </>
  );
};

export default { Component: SurfaceTransferIncoming, isVisible };
