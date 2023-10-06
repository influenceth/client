import { useCallback, useEffect, useMemo, useState } from 'react';
import { Asteroid, Building, Crew, Crewmate, Inventory, Product } from '@influenceth/sdk';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { ForwardIcon, InventoryIcon, LocationIcon, SurfaceTransferIcon, TransferToSiteIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer } from '~/lib/utils';
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
  ProgressBarSection,
  LotInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';

const TransferToSite = ({ asteroid, lot, deliveryManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { currentDeliveryAction, deliveryStatus, startDelivery, finishDelivery } = deliveryManager;
  const { crew, crewmateMap } = useCrewContext();
  const { data: currentDeliveryOriginLot } = useLot(asteroid.i, currentDeliveryAction?.originLotId);
  const { data: currentDeliveryDestinationLot } = useLot(asteroid.i, currentDeliveryAction?.destLotId);

  const destinationLot = useMemo(
    () => currentDeliveryAction ? currentDeliveryDestinationLot : lot,
    [currentDeliveryAction, currentDeliveryDestinationLot, lot]
  ) || {};

  const [originLot, setOriginLot] = useState();
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  const crewmates = currentDeliveryAction?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);

  // handle "currentDeliveryAction" state
  useEffect(() => {
    if (currentDeliveryAction) {
      setSelectedItems(currentDeliveryAction.contents);
    }
  }, [currentDeliveryAction]);

  useEffect(() => {
    if (currentDeliveryOriginLot) {
      setOriginLot(currentDeliveryOriginLot);
    }
  }, [currentDeliveryOriginLot]);

  // reset selectedItems if change origin lot before starting
  // TODO: in general, could probably remove all currentDeliveryAction stuff
  //  since we don't follow the course of the delivery in this dialog
  useEffect(() => {
    if (!currentDeliveryAction) setSelectedItems(props.preselect?.selectedItems || {});
  }, [originLot]);

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, originLot?.i, destinationLot?.i) || 0;
  const transportTime = Asteroid.getLotTravelTime(asteroid?.i, originLot?.i, destinationLot?.i, crewTravelBonus.totalBonus) || 0;

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * Product.TYPES[resourceId].massPerUnit;
      acc.totalVolume += selectedItems[resourceId] * Product.TYPES[resourceId].volumePerUnit;
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

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

  const originInvId = useMemo(() => {
    if (originLot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      return 1;
    } else if (originLot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
      return 0;
    }
    return null;
  }, [originLot?.building?.Building?.status]);

  const destInvId = useMemo(() => {
    if (destinationLot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      return 1;
    } else if (destinationLot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
      return 0;
    }
    return null;
  }, [destinationLot?.building?.Building?.status]);

  const originInventory = useMemo(() => {
    return originLot?.building?.Inventories.find((i) => i.slot === originInvId);
  }, [originInvId, originLot?.building?.Inventories]);

  const onStartDelivery = useCallback(() => {
    const destInventory = destinationLot?.building?.Inventories.find((i) => i.status === Inventory.STATUSES.AVAILABLE);
    const destInventoryConfig = Inventory.getType(destInventory?.inventoryType) || {};
    if (destInventory) {
      destInventoryConfig.massConstraint -= ((destInventory.mass || 0) + (destInventory.reservedMass || 0));
      destInventoryConfig.volumeConstraint -= ((destInventory.volume || 0) + (destInventory.reservedVolume || 0));
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
      originInvId: originInvId,
      destLotId: destinationLot?.i,
      destInvId,
      resources: selectedItems
    });
  }, [originInvId, destinationLot?.i, destInvId, selectedItems]);

  const buildingRequirements = useMemo(
    () => getBuildingRequirements(destinationLot?.building, destinationLot?.deliveries),
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
          <LotInputBlock
            title="Origin"
            lot={originLot}
            fallbackSublabel="Inventory"
            imageProps={{
              iconOverride: <InventoryIcon />,
              inventories: originLot?.building?.Inventories,
              showInventoryStatusForType: 1
            }}
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setOriginSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <LotInputBlock
            title="Destination"
            lot={lot}
            fallbackSublabel="Inventory"
            imageProps={{
              iconOverride: <InventoryIcon />,
              inventories: lot?.building?.Inventories,
              showInventoryStatusForType: 0,
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

        {stage !== actionStage.NOT_STARTED && (
          <ProgressBarSection
            finishTime={currentDeliveryAction?.finishTime}
            startTime={currentDeliveryAction?.startTime}
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
            inventory={originInventory?.contents || []}
            initialSelection={selectedItems}
            lot={lot}
            onClose={() => setTransferSelectorOpen(false)}
            onSelected={setSelectedItems}
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
      isLoading={reactBool(isLoading)}
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
