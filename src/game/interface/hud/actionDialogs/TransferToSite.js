import { useCallback, useEffect, useMemo, useState } from 'react';
import { Asteroid, Crewmate, Entity, Inventory, Lot, Permission, Product, Time } from '@influenceth/sdk';

import { ForwardIcon, InventoryIcon, LocationIcon, SurfaceTransferIcon, TransferToSiteIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses } from '~/lib/utils';
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
  ProgressBarSection,
  LotInputBlock,
  InventorySelectionDialog,
  InventoryInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';

const TransferToSite = ({ asteroid, lot: destinationLot, deliveryManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const { currentDeliveryActions, startDelivery } = deliveryManager;
  const { crew, crewCan } = useCrewContext();

  const crewmates = crew?._crewmates || [];
  const captain = crewmates[0];

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  // get destination and destinationInventory
  const destination = useMemo(() => ({
    id: destinationLot?.building?.id,
    label: Entity.IDS.BUILDING,
    lotIndex: Lot.toIndex(destinationLot?.id),
    slot: destinationLot?.building?.Inventories.find((i) => i.status === Inventory.STATUSES.AVAILABLE)?.slot
  }), [destinationLot]);
  const destinationInventory = useMemo(() => (destinationLot?.building?.Inventories || []).find((i) => i.slot === destination?.slot), [destinationLot, destination?.slot]);
  
  // get originLot and originInventory
  const [origin, setOrigin] = useState();
  const originLotId = useMemo(() => Lot.toId(asteroid?.id, origin?.lotIndex), [asteroid?.id, origin?.lotIndex]);
  const { data: originLot } = useLot(originLotId);
  const originEntity = useMemo(() => {
    if (!originLot || !origin) return null;
    if (origin.label === Entity.IDS.SHIP) return originLot.ships.find((s) => s.id === origin.id);
    return originLot.building;
  }, [originLot, origin]);
  const originInventory = useMemo(() => (originEntity?.Inventories || []).find((i) => i.slot === origin?.slot), [originEntity, origin]);

  // // handle "currentDeliveryAction" state
  // useEffect(() => {
  //   if (currentDeliveryAction) {
  //     setSelectedItems(currentDeliveryAction.contents);
  //   }
  // }, [currentDeliveryAction]);

  // useEffect(() => {
  //   if (currentDeliveryAction?.originLotId) {
  //     setOriginLotId(currentDeliveryAction?.originLotId);
  //   }
  // }, [currentDeliveryAction?.originLotId]);

  // // reset selectedItems if change origin lot before starting
  // // TODO: in general, could probably remove all currentDeliveryAction stuff
  // //  since we don't follow the course of the delivery in this dialog
  // useEffect(() => {
  //   if (!currentDeliveryAction) setSelectedItems(props.preselect?.selectedItems || {});
  // }, [originLot]);

  const [transportDistance, transportTime] = useMemo(() => {
    if (!asteroid?.id || !originLot?.id || !destinationLot?.id) return [0, 0];
    const originLotIndex = Lot.toIndex(originLot?.id);
    const destinationLotIndex = Lot.toIndex(destinationLot?.id);
    const transportDistance = Asteroid.getLotDistance(asteroid?.id, originLotIndex, destinationLotIndex);
    const transportTime = Time.toRealDuration(
      Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, destinationLotIndex, crewTravelBonus.totalBonus),
      crew?._timeAcceleration
    );
    return [transportDistance, transportTime];
  }, [asteroid?.id, originLot?.id, destinationLot?.id, crew?._timeAcceleration, crewTravelBonus]);

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * (Product.TYPES[resourceId].massPerUnit || 0);
      acc.totalVolume += selectedItems[resourceId] * (Product.TYPES[resourceId].volumePerUnit || 0);
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [0, transportTime];
  }, [transportTime]);

  const stats = useMemo(() => ([
    {
      label: 'Total Mass',
      value: `${formatMass(totalMass)}`,
      direction: 0
    },
    {
      label: 'Total Volume',
      value: `${formatVolume(totalVolume)}`,
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

  const onStartDelivery = useCallback(() => {
    const destInventoryConfig = Inventory.getType(destinationInventory?.inventoryType) || {};
    if (destinationInventory) {
      destInventoryConfig.massConstraint -= ((destinationInventory.mass || 0) + (destinationInventory.reservedMass || 0));
      destInventoryConfig.volumeConstraint -= ((destinationInventory.volume || 0) + (destinationInventory.reservedVolume || 0));
    }
    if (destInventoryConfig.massConstraint < totalMass || destInventoryConfig.volumeConstraint < totalVolume) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: `Insufficient capacity remaining at selected destination: ${formatSampleMass(destInventoryConfig.massConstraint)} tonnes or ${formatSampleVolume(destInventoryConfig.volumeConstraint)} m³` },
        duration: 10000
      });
      return;
    }

    startDelivery({
      origin,
      originSlot: originInventory?.slot,
      destination,
      destinationSlot: destinationInventory?.slot,
      contents: selectedItems
    }, { asteroidId: asteroid?.id, lotId: originLot?.id });
  }, [originInventory, destinationInventory, selectedItems, asteroid?.id, originLot?.id]);

  const buildingRequirements = useMemo(
    () => getBuildingRequirements(destinationLot?.building, currentDeliveryActions),
    [destinationLot?.building, currentDeliveryActions]
  );

  useEffect(() => {
    if (destinationLot?.building && !buildingRequirements.find((r) => r.inNeed > 0)) {
      onSetAction('CONSTRUCT');
    }
  }, [buildingRequirements, destinationLot?.building, onSetAction]);

  useEffect(() => {
    if (!destinationInventory) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Destination has no available inventories.' },
        duration: 5000,
        level: 'warning',
      });
      if (props.onClose) props.onClose();
    }
  }, [destinationInventory]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <TransferToSiteIcon />,
          label: 'Transfer to Site',
        }}
        captain={captain}
        location={{ asteroid, lot: destinationLot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <InventoryInputBlock
            title="Origin"
            entity={originEntity}
            imageProps={{
              iconOverride: <InventoryIcon />,
              inventories: originEntity?.Inventories,
              showInventoryStatusForType: origin?.slot
            }}
            isSourcing
            inventorySlot={origin?.slot}
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setOriginSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <LotInputBlock
            title="Destination"
            lot={destinationLot}
            fallbackSublabel="Inventory"
            imageProps={{
              iconOverride: <InventoryIcon />,
              inventories: destinationLot?.building?.Inventories,
              showInventoryStatusForType: destination?.slot,
              unfinished: true
            }}
          />
        </FlexSection>

        <TransferBuildingRequirementsSection
          label="Construction Requirements"
          onClick={originLot ? () => setTransferSelectorOpen(true) : null}
          requirements={buildingRequirements}
          selectedItems={selectedItems}
        />

        {/* TODO: don't ever show progress here... close if complete and user can link to individual surface transports
        {stage !== actionStage.NOT_STARTED && (
          <ProgressBarSection
            finishTime={currentDeliveryAction?.finishTime}
            startTime={currentDeliveryAction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={transportTime}
          />
        )}
        */}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!origin || totalMass === 0 || !crewCan(Permission.IDS.ADD_PRODUCTS, destinationLot?.building) || !crewCan(Permission.IDS.REMOVE_PRODUCTS, originEntity)}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onGo={onStartDelivery}
        stage={stage}
        waitForCrewReady
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <TransferSelectionDialog
            sourceEntity={originEntity}
            sourceContents={originInventory?.contents || []}
            pendingTargetDeliveries={currentDeliveryActions}
            targetInventory={destinationInventory}
            initialSelection={selectedItems}
            onClose={() => setTransferSelectorOpen(false)}
            onSelected={setSelectedItems}
            open={transferSelectorOpen}
          />

          <InventorySelectionDialog
            asteroidId={asteroid.id}
            otherEntity={destinationLot?.building}
            isSourcing
            itemIds={buildingRequirements.map(({ i }) => i)}
            onClose={() => setOriginSelectorOpen(false)}
            onSelected={setOrigin}
            open={originSelectorOpen}
            requirePresenceOfItemIds
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);

  const deliveryManager = useDeliveryManager({ destination: lot?.building });

  const [stage, innerKey] = useMemo(() => {
    if ((deliveryManager.currentDeliveryActions || []).find((d) => d.status === 'DEPARTING')) {
      return [actionStage.STARTING, deliveryManager.currentDeliveryActions.length - 1];
    }
    return [actionStage.NOT_STARTED, deliveryManager.currentDeliveryActions?.length || 0];
  }, [deliveryManager.loading, deliveryManager.currentVersion]);

  // TODO (nice-to-have): if requirements are all met, close the dialog

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage="SurfaceTransfer"
      isLoading={reactBool(isLoading || deliveryManager.isLoading)}
      stage={stage}>
      <TransferToSite
        key={innerKey}
        asteroid={asteroid}
        lot={lot}
        deliveryManager={deliveryManager}
        stage={stage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
