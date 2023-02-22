import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Construction, Inventory } from '@influenceth/sdk';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { SurfaceTransferIcon } from '~/components/Icons';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';
import {
  DestinationPlotSection,
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

const SurfaceTransfer = ({ asteroid, plot, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resources = useResourceAssets();
  // NOTE: plot should be destination if deliveryId > 0
  const { currentDelivery, deliveryStatus, startDelivery, finishDelivery } = useDeliveryManager(asteroid?.i, plot?.i, props.deliveryId);
  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentDeliveryOriginPlot } = usePlot(asteroid.i, currentDelivery?.originPlotId);
  const { data: currentDeliveryDestinationPlot } = usePlot(asteroid.i, currentDelivery?.destPlotId);

  const originPlot = useMemo(
    () => currentDelivery ? currentDeliveryOriginPlot : plot,
    [currentDelivery, currentDeliveryOriginPlot, plot]
  ) || {};
  const [destinationPlot, setDestinationPlot] = useState();
  const [selectedItems, setSelectedItems] = useState({});

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
    if (currentDeliveryDestinationPlot) {
      setDestinationPlot(currentDeliveryDestinationPlot);
    }
  }, [currentDeliveryDestinationPlot]);

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, originPlot?.i, destinationPlot?.i) || 0;
  const transportTime = Asteroid.getLotTravelTime(asteroid?.i, originPlot?.i, destinationPlot?.i, crewTravelBonus.totalBonus) || 0;

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
    if (originPlot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      return 1;
    } else if (originPlot?.building?.construction?.status === Construction.STATUS_PLANNED) {
      return 0;
    }
    return null;
  }, [originPlot?.building?.construction?.status]);

  const destInvId = useMemo(() => {
    if (destinationPlot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      return 1;
    } else if (destinationPlot?.building?.construction?.status === Construction.STATUS_PLANNED) {
      return 0;
    }
    return null;
  }, [destinationPlot]);

  const originInventory = useMemo(() => {
    return (originPlot?.building?.inventories || {})[originInvId];
  }, [originInvId, originPlot?.building?.inventories]);

  const onStartDelivery = useCallback(() => {
    let destCapacityRemaining = { ...Inventory.CAPACITIES[destinationPlot?.building?.capableType][destInvId] };
    if (destinationPlot?.building?.inventories && destinationPlot?.building?.inventories[destInvId]) {
      // Capacities are in tonnes and cubic meters, Inventories are in grams and mLs
      destCapacityRemaining.mass -= 1e-6 * ((destinationPlot.building.inventories[destInvId].mass || 0) + (destinationPlot.building.inventories[destInvId].reservedMass || 0));
      destCapacityRemaining.volume -= 1e-6 * ((destinationPlot.building.inventories[destInvId].volume || 0) + (destinationPlot.building.inventories[destInvId].reservedVolume || 0));
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
      destPlotId: destinationPlot?.i,
      destInvId,
      resources: selectedItems
    });
  }, [originInvId, destinationPlot?.i, destInvId, selectedItems]);

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
        plot={currentDeliveryOriginPlot || originPlot}
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

      <DestinationPlotSection
        asteroid={asteroid}
        originPlot={originPlot}
        destinationPlot={destinationPlot}
        onDestinationSelect={setDestinationPlot}
        status={status} />

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers crewAvailableIn={0} actionReadyIn={transportTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsLoading={deliveryStatus === 'FINISHING' || undefined}
        finalizeLabel="Complete"
        goDisabled={!destinationPlot?.i || totalMass === 0}
        goLabel="Transfer"
        onFinalize={() => finishDelivery()}
        onGo={onStartDelivery}
        status={deliveryStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default SurfaceTransfer;