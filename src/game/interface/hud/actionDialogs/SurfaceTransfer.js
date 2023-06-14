import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Construction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { ForwardIcon, InventoryIcon, LocationIcon, RouteIcon, SurfaceTransferIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';
import {
  ItemSelectionSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  formatMass,
  formatSampleMass,
  formatSampleVolume,
  formatVolume,
  getBonusDirection,
  TimeBonusTooltip,
  EmptyBuildingImage,
  BuildingImage,
  FlexSectionSpacer,
  ActionDialogBody,
  FlexSectionInputBlock,
  FlexSection,
  TransferSelectionDialog,
  DestinationSelectionDialog,
  ProgressBarSection,
  Mouseoverable,
  getCapacityUsage,
  ActionDialogTabs,
  InventoryChangeCharts,
  CrewOwnerBlock,
  TransferDistanceDetails
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import useCrew from '~/hooks/useCrew';

const Overloaded = styled.div`
  color: ${p => p.theme.colors.error};
  font-size: 12px;
  margin-top: 6px;
  text-transform: uppercase;
`;

const SurfaceTransfer = ({ asteroid, lot, deliveryManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();

  const { currentDelivery, deliveryStatus, startDelivery, finishDelivery } = deliveryManager;
  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentDeliveryOriginLot } = useLot(asteroid.i, currentDelivery?.originLotId);
  const { data: currentDeliveryDestinationLot } = useLot(asteroid.i, currentDelivery?.destLotId);

  const originLot = useMemo(
    () => (currentDelivery ? currentDeliveryOriginLot : lot) || {},
    [currentDelivery, currentDeliveryOriginLot, lot]
  );
  const [destinationLot, setDestinationLot] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});
  const [tab, setTab] = useState(0);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();

  const { data: originLotOccupier } = useCrew(originLot?.occupier);
  const { data: destinationLotOccupier } = useCrew(destinationLot?.occupier);

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
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * resources[resourceId].massPerUnit;
      acc.totalVolume += selectedItems[resourceId] * resources[resourceId].volumePerUnit;
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

  const stats = useMemo(() => ([
    {
      label: 'Task Duration',
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
    {
      label: 'Transfer Distance',
      value: `${Math.round(transportDistance)} km`,
      direction: 0
    },
    {
      label: 'Transfered Mass',
      value: `${formatMass(totalMass * 1e6)}`,
      direction: 0
    },
    {
      label: 'Transfered Volume',
      value: `${formatVolume(totalVolume * 1e6)}`,
      direction: 0
    },
  ]), [totalMass, totalVolume, transportDistance, transportTime]);

  const destinationOverloaded = useMemo(() => {
    const showInventoryStatusForType = 1; // TODO: ...
    if (destinationLot?.building?.capableType && destinationLot?.building?.inventories) {
      const capacity = getCapacityUsage(buildings[destinationLot.building.capableType], destinationLot.building.inventories, showInventoryStatusForType);
      if (capacity.mass.used + capacity.mass.reserved + totalMass * 1e6 > capacity.mass.max) {
        return true;
      }
      if (capacity.volume.used + capacity.volume.reserved + totalVolume * 1e6 > capacity.volume.max) {
        return true;
      }
    }
    return false;
  }, [totalMass, totalVolume, destinationLot])

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

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <SurfaceTransferIcon />,
          label: 'Surface Transfer',
        }}
        captain={captain}
        crewAvailableTime={0}
        taskCompleteTime={transportTime}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Transfer' },
            { icon: <InventoryIcon />, iconStyle: { fontSize: 22 }, label: 'Inventory' },
          ]} />

        <FlexSection>
          <FlexSectionInputBlock
            title="Origin"
            image={(
              <BuildingImage
                building={buildings[lot.building?.capableType || 0]}
                inventories={lot.building?.inventories}
                showInventoryStatusForType={1} />
            )}
            label={buildings[lot.building?.capableType || 0]?.name}
            sublabel={<><LocationIcon /> Lot {lot.i.toLocaleString()}</>}
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <FlexSectionInputBlock
            title="Destination"
            titleDetails={<TransferDistanceDetails distance={transportDistance} />}
            image={
              destinationLot
                ? (
                  <BuildingImage
                    building={buildings[destinationLot.building?.capableType || 0]}
                    error={destinationOverloaded}
                    inventories={destinationLot?.building?.inventories}
                    showInventoryStatusForType={1} />
                )
                : <EmptyBuildingImage iconOverride={<InventoryIcon />} />
            }
            isSelected={stage === actionStage.NOT_STARTED}
            label={destinationLot ? buildings[destinationLot.building?.capableType || 0]?.name : 'Select'}
            onClick={() => { setDestinationSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel={
              destinationLot
              ? (
                <>
                  <LocationIcon /> Lot {destinationLot.i.toLocaleString()}
                  {destinationOverloaded && <Overloaded>Insufficient Capacity</Overloaded>}
                </>
              )
              : 'Inventory'
            } />
        </FlexSection>

        {tab === 0 && (
          <>
            <ItemSelectionSection
              label="Transfer Items"
              items={selectedItems}
              onClick={stage === actionStage.NOT_STARTED && (() => setTransferSelectorOpen(true))}
              resources={resources}
              stage={stage} />

            {stage !== actionStage.NOT_STARTED && (
              <ProgressBarSection
                completionTime={currentDelivery?.completionTime}
                startTime={currentDelivery?.startTime}
                stage={stage}
                title="Progress"
                totalTime={transportTime}
              />
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <FlexSection>
              <div style={{ width: '50%' }}>
                <InventoryChangeCharts
                  building={originLot?.building}
                  inventoryType={originInvId}
                  deltaMass={-totalMass}
                  deltaVolume={-totalVolume}
                />
              </div>
              <FlexSectionSpacer />
              <div style={{ width: '50%' }}>
                <InventoryChangeCharts
                  building={destinationLot?.building}
                  inventoryType={destInvId}
                  deltaMass={totalMass}
                  deltaVolume={totalVolume}
                />
              </div>
            </FlexSection>

            {(originLot && destinationLot && originLot?.occupier !== destinationLot?.occupier) && (
              <FlexSection>
                <CrewOwnerBlock crew={originLotOccupier} isMe={originLot?.occupier === crew?.i} />

                <FlexSectionSpacer />

                <CrewOwnerBlock crew={destinationLotOccupier} isMe={destinationLot?.occupier === crew?.i} />
              </FlexSection>  
            )}
          </>
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!destinationLot?.i || totalMass === 0}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onFinalize={finishDelivery}
        onGo={onStartDelivery}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <TransferSelectionDialog
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
            onClose={() => setDestinationSelectorOpen(false)}
            onSelected={setDestinationLot}
            open={destinationSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);

  // NOTE: lot should be destination if deliveryId > 0
  const deliveryManager = useDeliveryManager(asteroid?.i, lot?.i, props.deliveryId);
  const { deliveryStatus, actionStage } = deliveryManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // handle auto-closing on any status change
  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && deliveryStatus !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = deliveryStatus;
  }, [deliveryStatus]);

  return (
    <ActionDialogInner
      actionImage={surfaceTransferBackground}
      asteroid={asteroid}
      isLoading={isLoading}
      lot={lot}
      onClose={props.onClose}
      stage={actionStage}>
      <SurfaceTransfer
        asteroid={asteroid}
        lot={lot}
        deliveryManager={deliveryManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
