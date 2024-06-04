import { useCallback, useMemo, useState } from 'react';
import { Inventory, Permission } from '@influenceth/sdk';

import { TransferFromIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import { locationsArrToObj } from '~/lib/utils';
import useEntity from '~/hooks/useEntity';
import useOrdersByInventory from '~/hooks/useOrdersByInventory';
import useUnresolvedActivities from '~/hooks/useUnresolvedActivities';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import ActionButtonStack from './ActionButtonStack';

const isVisible = ({ crew, lot, ship }) => {
  const entity = ship || lot?.surfaceShip || lot?.building;
  return crew && ((entity?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE));
};

const SurfaceTransferOutgoing = ({ asteroid, crew, lot, ship, onSetAction, dialogProps = {}, _disabled }) => {
  const origin = useMemo(() => ship || lot?.surfaceShip || lot?.building, [ship, lot]);
  const { data: inventoryOrders } = useOrdersByInventory(origin);
  const { currentDeliveryActions: originDeliveryActions, isLoading } = useDeliveryManager({ origin });
  const { data: originActionItems } = useUnresolvedActivities(origin);
  
  const deliveryDeparting = useMemo(() => {
    return (originDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [originDeliveryActions]);

  // if outgoing package from origin, prompt anyone with remove_products perms on
  // origin to review/potentially cancel package
  const currentDeliveryStack = useMemo(
    () => {
      const actionStack = [];
      if (Permission.isPermitted(crew, Permission.IDS.REMOVE_PRODUCTS, origin)) {
        (originDeliveryActions || []).forEach((delivery) => {
          if (['PACKAGING', 'PACKAGED'].includes(delivery.status)) {
            actionStack.push({
              label: 'Outgoing Proposal',
              finishTime: delivery.status === 'PACKAGED' ? undefined : delivery.action?.finishTime,
              onClick: () => onSetAction('SURFACE_TRANSFER', { deliveryId: delivery.action?.deliveryId })
            });
          }
        });
        (inventoryOrders || []).forEach((order) => {
          actionStack.push({
            label: `Limit Sell`,
            preloadEntity: order?.entity,
            onClick: (entity) => {
              const exchangeLoc = locationsArrToObj(entity?.Location?.locations || []);
              onSetAction('MARKETPLACE_ORDER',  {
                exchange: entity,
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
              })
            }
          });
        });
        // (none of these apply currently)
        // (originActionItems || []).forEach((a) => {
        //   ...
        // });
      }
      return actionStack;
    },
    [crew, origin, originDeliveryActions, originActionItems, inventoryOrders, onSetAction]
  );

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, origin, ...dialogProps });
  }, [onSetAction, origin, dialogProps]);

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
        <ActionButtonStack
          stack={currentDeliveryStack}
          stackLabel={
            currentDeliveryStack.length > 1
            ? `${currentDeliveryStack.length} Outgoing Proposal${currentDeliveryStack.length === 1 ? '' : 's'}`
            : `Outgoing Proposal`
          }
          icon={<TransferFromIcon />}
        />
      )}
    </>
  );
};

export default { Component: SurfaceTransferOutgoing, isVisible };
