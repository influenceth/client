import { useCallback, useMemo, useRef, useState } from 'react';
import { Inventory, Order, Permission } from '@influenceth/sdk';

import { SwayIcon, TransferFromIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { locationsArrToObj } from '~/lib/utils';
import useEntity from '~/hooks/useEntity';
import useOrdersByInventory from '~/hooks/useOrdersByInventory';
import useUnresolvedActivities from '~/hooks/useUnresolvedActivities';

const isVisible = ({ crew, lot, ship }) => {
  const entity = ship || lot?.surfaceShip || lot?.building;
  return crew && ((entity?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE));
};

const StackButton = ({ delivery, onClick, onSetAction, order, otherAction, ...props }) => {
  const { data: destEntity } = useEntity(/*otherAction?.event?.returnValues?.extractor || */order?.entity);

  const handleClick = useCallback(() => {
    if (delivery) {
      onSetAction('SURFACE_TRANSFER', { deliveryId: delivery.action?.deliveryId });
    } else if (order && destEntity) {
      const exchangeLoc = locationsArrToObj(destEntity?.Location?.locations || []);
      onSetAction('MARKETPLACE_ORDER', {
        exchange: destEntity,
        asteroidId: exchangeLoc?.asteroidId,
        lotId: exchangeLoc?.lotId,
        mode: 'sell',
        type: 'limit',
        resourceId: order.product,
        isCancellation: true,
        preselect: {
          limitPrice: order.price,
          quantity: order.amount,
          storage: order.storage,
          storageSlot: order.storageSlot
        }
      });
    } else if (destEntity) {
      // ...
    } else {
      return; // (presumably wait for load)
    }

    if (onClick) onClick();
  }, [delivery, onSetAction, onClick, order, destEntity, otherAction]);

  return (
    <ActionButton
      {...props}
      onClick={handleClick} />
  );
};

const SurfaceTransferOutgoing = ({ asteroid, crew, lot, ship, onSetAction, dialogProps = {}, _disabled }) => {
  const origin = useMemo(() => ship || lot?.surfaceShip || lot?.building, [ship, lot]);
  const { data: inventoryOrders } = useOrdersByInventory(origin);
  const { currentDeliveryActions: originDeliveryActions, isLoading } = useDeliveryManager({ origin });
  const { data: originActionItems } = useUnresolvedActivities(origin);
  
  const deliveryDeparting = useMemo(() => {
    return (originDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [originDeliveryActions]);

  const [clickTally, setClickTally] = useState(0);

  // if outgoing package from origin, prompt anyone with remove_products perms on
  // origin to review/potentially cancel package
  const currentDeliveryStack = useMemo(
    () => {
      const actionStack = [];
      if (Permission.isPermitted(crew, Permission.IDS.REMOVE_PRODUCTS, origin)) {
        (originDeliveryActions || []).forEach((d) => {
          if (['PACKAGING', 'PACKAGED'].includes(d.status)) {
            actionStack.push({ delivery: d })
          }
        });
        (inventoryOrders || []).forEach((o) => {
          if (o.orderType === Order.IDS.LIMIT_SELL) {
            actionStack.push({ order: o });
          }
        });
        // (none of these apply currently)
        // (originActionItems || []).forEach((a) => {
        //   if (['MaterialProcessingStarted', 'ResourceExtractionStarted'].includes(a.event.name)) {
        //     actionStack.push({ otherAction: a });
        //   }
        // });
      }
      return actionStack;
    },
    [crew, origin, originDeliveryActions, originActionItems, inventoryOrders]
  );

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, origin, ...dialogProps });
  }, [currentDeliveryStack, onSetAction, origin, dialogProps]);

  const disabledReason = useMemo(() => {
    if (!origin) return '';
    const _location = locationsArrToObj(origin.Location?.locations || []);
    if (!_location?.lotId) return 'not on surface';
    const hasMass = (origin.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.mass > 0);
    if (!hasMass) return 'inventory empty';

    return getCrewDisabledReason({
      asteroid, crew, permission: Permission.IDS.REMOVE_PRODUCTS, permissionTarget: origin, requireReady: false
    });
  }, [origin, crew]);

  const [stackAttention, stackTime] = useMemo(() => {
    return [
      currentDeliveryStack
        .find((a) => a.delivery?.status === 'PACKAGED'),
      currentDeliveryStack[0]?.delivery?.action?.finishTime
    ];
  }, [currentDeliveryStack]);

  return (
    <>
      <ActionButton
        label="Send From"
        labelAddendum={disabledReason}
        flags={{
          disabled: _disabled || disabledReason || isLoading,
          loading: deliveryDeparting
        }}
        icon={<TransferFromIcon />}
        onClick={handleClick} />

      {currentDeliveryStack.length > 0 && (
        <StackButton
          {...currentDeliveryStack[clickTally % currentDeliveryStack?.length]}
          label={
            currentDeliveryStack.length > 1
            ? `${currentDeliveryStack.length} Outgoing Proposal${currentDeliveryStack.length === 1 ? '' : 's'}`
            : `Outgoing Proposal`
          }
          flags={{
            attention: stackAttention,
            loading: !stackAttention,
            tally: currentDeliveryStack.length,
            finishTime: currentDeliveryStack.length > 1 ? undefined : stackTime
          }}
          icon={<TransferFromIcon />}
          onClick={() => setClickTally((c) => c + 1)}
          onSetAction={onSetAction}
        />
      )}
    </>
  );
};

export default { Component: SurfaceTransferOutgoing, isVisible };
