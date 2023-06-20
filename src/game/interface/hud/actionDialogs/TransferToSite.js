import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Construction, Inventory } from '@influenceth/sdk';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { ForwardIcon, InventoryIcon, LocationIcon, SurfaceTransferIcon, TransferToSiteIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';
import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  TransferBuildingRequirementsSection,
  formatSampleMass,
  formatSampleVolume,
  getBuildingRequirements,
  TimeBonusTooltip,
  formatMass,
  formatVolume,
  getBonusDirection,
  EmptyBuildingImage,
  BuildingImage,
  FlexSectionSpacer,
  ActionDialogBody,
  FlexSectionInputBlock,
  FlexSection,
  TransferSelectionDialog,
  DestinationSelectionDialog,
  ProgressBarSection
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';

const TransferToSite = ({ asteroid, lot, deliveryManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();

  const { currentDelivery, deliveryStatus, startDelivery, finishDelivery } = deliveryManager;
  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentDeliveryOriginLot } = useLot(asteroid.i, currentDelivery?.originLotId);
  const { data: currentDeliveryDestinationLot } = useLot(asteroid.i, currentDelivery?.destLotId);

  const destinationLot = useMemo(
    () => currentDelivery ? currentDeliveryDestinationLot : lot,
    [currentDelivery, currentDeliveryDestinationLot, lot]
  ) || {};

  const [originLot, setOriginLot] = useState();
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
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
    if (currentDeliveryOriginLot) {
      setOriginLot(currentDeliveryOriginLot);
    }
  }, [currentDeliveryOriginLot]);

  // reset selectedItems if change origin lot before starting
  // TODO: in general, could probably remove all currentDelivery stuff
  //  since we don't follow the course of the delivery in this dialog
  useEffect(() => {
    if (!currentDelivery) setSelectedItems(props.preselect?.selectedItems || {});
  }, [originLot]);

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, originLot?.i, destinationLot?.i) || 0;
  const transportTime = Asteroid.getLotTravelTime(asteroid?.i, originLot?.i, destinationLot?.i, crewTravelBonus.totalBonus) || 0;

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * resources[resourceId].massPerUnit;
      acc.totalVolume += selectedItems[resourceId] * resources[resourceId].volumePerUnit;
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

  const buildingRequirements = useMemo(
    () => getBuildingRequirements(destinationLot?.building),
    [destinationLot?.building]
  );

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <TransferToSiteIcon />,
          label: 'Transfer to Site',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={0}
        onClose={props.onClose}
        taskCompleteTime={transportTime}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Origin"
            image={
              originLot
                ? (
                  <BuildingImage
                    building={buildings[originLot.building?.capableType || 0]}
                    inventories={originLot?.building?.inventories}
                    showInventoryStatusForType={1} />
                )
                : <EmptyBuildingImage iconOverride={<InventoryIcon />} />
            }
            label={originLot ? buildings[originLot.building?.capableType || 0]?.name : 'Select'}
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setOriginSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel={originLot ? <><LocationIcon /> Lot {originLot.i.toLocaleString()}</> : 'Inventory'}
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <FlexSectionInputBlock
            title="Destination"
            image={(
              <BuildingImage
                building={buildings[lot.building?.capableType || 0]}
                inventories={lot.building?.inventories}
                showInventoryStatusForType={0}
                unfinished />
            )}
            label={buildings[lot.building?.capableType || 0]?.name}
            sublabel={<><LocationIcon /> Lot {lot.i.toLocaleString()}</>}
          />
        </FlexSection>

        <TransferBuildingRequirementsSection
          label="Construction Requirements"
          onClick={originLot ? () => setTransferSelectorOpen(true) : null}
          requirements={buildingRequirements}
          resources={resources}
          selectedItems={selectedItems}
        />

        {stage !== actionStage.NOT_STARTED && (
          <ProgressBarSection
            completionTime={currentDelivery?.completionTime}
            startTime={currentDelivery?.startTime}
            stage={stage}
            title="Progress"
            totalTime={transportTime}
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!originLot?.i || totalMass === 0}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onFinalize={finishDelivery}
        onGo={onStartDelivery}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <TransferSelectionDialog
            requirements={buildingRequirements}
            inventory={originInventory?.resources || {}}
            initialSelection={selectedItems}
            lot={lot}
            onClose={() => setTransferSelectorOpen(false)}
            onSelected={setSelectedItems}
            resources={resources}
            open={transferSelectorOpen}
          />

          <DestinationSelectionDialog
            asteroid={asteroid}
            originLotId={lot?.i}
            initialSelection={undefined}
            onClose={() => setOriginSelectorOpen(false)}
            onSelected={setOriginLot}
            open={originSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);

  // NOTE: lot should be destination if deliveryId > 0
  const deliveryManager = useDeliveryManager(asteroid?.i, lot?.i);
  const { deliveryStatus, actionStage } = deliveryManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // TODO: UX flow:
  //  start delivery --> pending
  //  once underway... are requirements now met?
  //    yes? send to construction dialog
  //    no? reset this dialog (requirements will be updated)
  // const lastStatus = useRef();
  // useEffect(() => {
  //   if (lastStatus.current && deliveryStatus !== lastStatus.current) {
  //     props.onClose();
  //   }
  //   lastStatus.current = deliveryStatus;
  // }, [deliveryStatus]);

  return (
    <ActionDialogInner
      actionImage={surfaceTransferBackground}
      isLoading={isLoading}
      stage={actionStage}>
      <TransferToSite
        asteroid={asteroid}
        lot={lot}
        deliveryManager={deliveryManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
