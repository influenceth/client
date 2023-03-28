import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Construction, Inventory } from '@influenceth/sdk';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { SurfaceTransferIcon } from '~/components/Icons';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';
import {
  DestinationLotSection,
  ItemSelectionSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTimers,
  getBonusDirection,
  formatSampleMass,
  formatSampleVolume,
  TimeBonusTooltip,
  formatMass,
  formatVolume,
} from './components';

const SurfaceTransfer = ({ asteroid, lot, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resources = useResourceAssets();
  // NOTE: lot should be destination if deliveryId > 0
  const { currentDelivery, deliveryStatus, startDelivery, finishDelivery } = useDeliveryManager(asteroid?.i, lot?.i, props.deliveryId);
  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentDeliveryOriginLot } = useLot(asteroid.i, currentDelivery?.originLotId);
  const { data: currentDeliveryDestinationLot } = useLot(asteroid.i, currentDelivery?.destLotId);

  const originLot = useMemo(
    () => currentDelivery ? currentDeliveryOriginLot : lot,
    [currentDelivery, currentDeliveryOriginLot, lot]
  ) || {};
  const [destinationLot, setDestinationLot] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  const crewMembers = currentDelivery?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  // handle "currentDelivery" state
  useEffect(() => {
    if (currentDelivery) {
      setSelectedItems(currentDelivery.resources);
    }
  }, [currentDelivery]);

  useEffect(() => {
    if (currentDeliveryDestinationLot) {
      setDestinationLot(currentDeliveryDestinationLot);
    }
  }, [currentDeliveryDestinationLot]);

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, originLot?.i, destinationLot?.i) || 0;
  const transportTime = Asteroid.getLotTravelTime(asteroid?.i, originLot?.i, destinationLot?.i, crewTravelBonus.totalBonus) || 0;

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, cur) => {
      acc.totalMass += selectedItems[cur] * resources[cur].massPerUnit;
      acc.totalVolume += selectedItems[cur] * resources[cur].volumePerUnit;
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

  const stats = useMemo(() => ([
    {
      label: 'Total Mass',
      value: `${formatMass(totalMass * 1e6)}`,
      direction: 0
    },
    {
      label: 'Total Volume',
      value: `${formatVolume(totalVolume * 1e6)}`,
      direction: 0
    },
    {
      label: 'Transfer Distance',
      value: `${Math.round(transportDistance)} km`,
      direction: 0
    },
    {
      label: 'Transport Time',
      value: formatTimer(transportTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
          title="Transport Time"
          totalTime={transportTime}
          crewRequired="start" />
      )
    },
  ]), [totalMass, totalVolume, transportDistance, transportTime]);

  const status = useMemo(() => {
    if (deliveryStatus === 'READY') {
      return 'BEFORE';
    } else if (deliveryStatus === 'DEPARTING' || deliveryStatus === 'IN_TRANSIT') {
      return 'DURING';
    }
    return 'AFTER';
  }, [deliveryStatus]);

  const originInvId = useMemo(() => {
    if (originLot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      return 1;
    } else if (originLot?.building?.construction?.status === Construction.STATUS_PLANNED) {
      return 0;
    }
    return null;
  }, [originLot?.building?.construction?.status]);

  const destInvId = useMemo(() => {
    if (destinationLot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      return 1;
    } else if (destinationLot?.building?.construction?.status === Construction.STATUS_PLANNED) {
      return 0;
    }
    return null;
  }, [destinationLot]);

  const originInventory = useMemo(() => {
    return (originLot?.building?.inventories || {})[originInvId];
  }, [originInvId, originLot?.building?.inventories]);

  const onStartDelivery = useCallback(() => {
    let destCapacityRemaining = { ...Inventory.CAPACITIES[destinationLot?.building?.capableType][destInvId] };
    if (destinationLot?.building?.inventories && destinationLot?.building?.inventories[destInvId]) {
      // Capacities are in tonnes and cubic meters, Inventories are in grams and mLs
      destCapacityRemaining.mass -= 1e-6 * ((destinationLot.building.inventories[destInvId].mass || 0) + (destinationLot.building.inventories[destInvId].reservedMass || 0));
      destCapacityRemaining.volume -= 1e-6 * ((destinationLot.building.inventories[destInvId].volume || 0) + (destinationLot.building.inventories[destInvId].reservedVolume || 0));
    }
    if (destCapacityRemaining.mass < totalMass || destCapacityRemaining.volume < totalVolume) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        content: `Insufficient capacity remaining at selected destination: ${formatSampleMass(destCapacityRemaining.mass)} tonnes or ${formatSampleVolume(destCapacityRemaining.volume)} m³`,
        duration: 10000
      });
      return;
    }

    startDelivery({
      originInvId: originInvId,
      destLotId: destinationLot?.i,
      destInvId,
      resources: selectedItems
    });
  }, [originInvId, destinationLot?.i, destInvId, selectedItems]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && deliveryStatus !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = deliveryStatus;
  }, [deliveryStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        lot={currentDeliveryOriginLot || originLot}
        action={{
          actionIcon: <SurfaceTransferIcon />,
          headerBackground: surfaceTransferBackground,
          label: 'Surface Transfer',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={currentDelivery?.startTime}
        targetTime={currentDelivery?.completionTime}
        {...props} />

      <ItemSelectionSection
        inventory={originInventory?.resources || {}}
        onSelectItems={setSelectedItems}
        resources={resources}
        selectedItems={selectedItems}
        status={status} />

      <DestinationLotSection
        asteroid={asteroid}
        originLot={originLot}
        destinationLot={destinationLot}
        onDestinationSelect={setDestinationLot}
        status={status} />

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers crewAvailableIn={0} actionReadyIn={transportTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsLoading={deliveryStatus === 'FINISHING' || undefined}
        finalizeLabel="Complete"
        goDisabled={!destinationLot?.i || totalMass === 0}
        goLabel="Transfer"
        onFinalize={() => finishDelivery()}
        onGo={onStartDelivery}
        status={deliveryStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default SurfaceTransfer;