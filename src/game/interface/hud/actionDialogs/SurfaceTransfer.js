import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Building, Crew, Crewmate, Entity, Inventory, Lot, Product } from '@influenceth/sdk';
import styled from 'styled-components';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { ForwardIcon, InventoryIcon, LocationIcon, RouteIcon, SurfaceTransferIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses } from '~/lib/utils';
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
  ActionDialogTabs,
  InventoryChangeCharts,
  CrewOwnerBlock,
  TransferDistanceDetails,
  FlexSectionBlock,
  WarningAlert,
  SwayInputBlock,
  SwayInputBlockInner,
  LotInputBlock,
  InventorySelectionDialog,
  getCapacityStats,
  InventoryInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import useCrew from '~/hooks/useCrew';
import theme from '~/theme';
import CrewIndicator from '~/components/CrewIndicator';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';

const SurfaceTransfer = ({
  asteroid,
  deliveryManager,

  origin,
  originLot,
  originSlot,

  dest,
  currentDelivery,

  stage,
  ...props
}) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { startDelivery, finishDelivery } = deliveryManager;
  const { crew, crewmateMap } = useCrewContext();

  const crewmates = (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  // get origin and originInventory
  const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => originSlot ? (i.slot === originSlot) : (i.status === Inventory.STATUSES.AVAILABLE)), [origin, originSlot]);
  const { data: originController } = useCrew(origin?.Control?.controller?.id);

  // get destinationLot and destinationInventory
  const [destinationSelection, setDestinationSelection] = useState(
    (currentDelivery && dest && {
      id: dest.id,
      label: dest.label,
      lotIndex: locationsArrToObj(dest.Location?.locations || []).lotIndex,
      slot: currentDelivery.destSlot
    }) || undefined
  );
  const { data: destination } = useEntity(destinationSelection ? { id: destinationSelection.id, label: destinationSelection.label } : undefined);
  const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  const { data: destinationLot } = useLot(destinationLotId);
  const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === destinationSelection?.slot), [destination, destinationSelection]);
  const { data: destinationController } = useCrew(destination?.Control?.controller?.id);

  // handle "currentDeliveryAction" state
  useEffect(() => {
    if (currentDelivery) {
      setSelectedItems(currentDelivery.contents.reduce((acc, item) => ({ ...acc, [item.product]: item.amount }), {}));
    }
  }, [currentDelivery]);

  const [transportDistance, transportTime] = useMemo(() => {
    if (!asteroid?.id || !originLot?.id || !destinationLot?.id) return [0, 0];
    const originLotIndex = Lot.toIndex(originLot?.id);
    const destinationLotIndex = Lot.toIndex(destinationLot?.id);
    const transportDistance = Asteroid.getLotDistance(asteroid?.id, originLotIndex, destinationLotIndex);
    const transportTime = Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, destinationLotIndex, crewTravelBonus.totalBonus, crewTravelBonus.timeMultiplier);
    return [transportDistance, transportTime];
  }, [asteroid?.id, originLot?.id, destinationLot?.id, crewTravelBonus]);

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * Product.TYPES[resourceId].massPerUnit;
      acc.totalVolume += selectedItems[resourceId] * Product.TYPES[resourceId].volumePerUnit;
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
      value: `${formatMass(totalMass)}`,
      direction: 0
    },
    {
      label: 'Transfered Volume',
      value: `${formatVolume(totalVolume)}`,
      direction: 0
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

  const onFinishDelivery = useCallback(() => {
    finishDelivery(props.deliveryId, {
      asteroidId: asteroid?.id,
      lotId: destinationLot?.id,
    });
  }, [props.deliveryId, asteroid?.id, destinationLot?.id]);

  const actionDetails = useMemo(() => {
    let overrideColor = undefined;
    let status = undefined;
    if (stage === actionStage.NOT_STARTED) {
      // TODO: should use entity, not lot
      if (destinationLot && destinationLot?.building?.Control?.controller?.id !== crew?.id) {
        status = 'Send to Crew';
        overrideColor = theme.colors.green;
      } else {
        status = 'Send Items';
        overrideColor = theme.colors.main;
      }
    }
    return { overrideColor, status };
  }, [crew, destinationLot, stage]);

  console.log({ originLot, destinationLot });

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <SurfaceTransferIcon />,
          label: 'Surface Transfer',
          status: actionDetails.status
        }}
        captain={captain}
        location={{ asteroid, lot: originLot }}
        crewAvailableTime={0}
        onClose={props.onClose}
        overrideColor={actionDetails.overrideColor}
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
          <InventoryInputBlock
            title="Origin"
            entity={origin}
            inventorySlot={originSlot} />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <InventoryInputBlock
            title="Destination"
            titleDetails={<TransferDistanceDetails distance={transportDistance} />}
            disabled={stage !== actionStage.NOT_STARTED}
            entity={destination}
            inventorySlot={destinationInventory?.slot}
            imageProps={{
              iconOverride: <InventoryIcon />,
            }}
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setDestinationSelectorOpen(true) }}
            sublabel={
              destinationLot
              ? <><LocationIcon /> {formatters.lotName(destinationSelection?.lotIndex)}</>
              : 'Inventory'
            }
            transferMass={totalMass}
            transferVolume={totalVolume} />
        </FlexSection>

        {tab === 0 && (
          <>
            {(!destinationLot || destinationLot?.building?.Control?.controller?.id === crew?.id)
              ? (
                <ItemSelectionSection
                  label="Transfer Items"
                  items={selectedItems}
                  onClick={stage === actionStage.NOT_STARTED ? (() => setTransferSelectorOpen(true)) : undefined}
                  stage={stage} />
              )
              : (
                <FlexSection>
                  <FlexSectionBlock title="Offered Items" bodyStyle={{ height: 'auto', padding: 0 }}>
                    <ItemSelectionSection
                      columns={3}
                      label="Transfer Items"
                      items={selectedItems}
                      onClick={stage === actionStage.NOT_STARTED ? (() => setTransferSelectorOpen(true)) : undefined}
                      stage={stage}
                      unwrapped />
                  </FlexSectionBlock>

                  <FlexSectionSpacer />

                  <div style={{ alignSelf: 'flex-start', width: '50%' }}>
                    <CrewIndicator crew={crew} />

                    <WarningAlert severity="warning" style={{ marginBottom: 20 }}>
                      <div><WarningOutlineIcon /></div>
                      <div>The destination is controlled by a different crew.</div>
                    </WarningAlert>

                    <SwayInputBlockInner
                      instruction="OPTIONAL: You may request a SWAY payment from the controlling crew in exchange for goods delivered." />
                  </div>

                </FlexSection>
              )
            }

            {stage !== actionStage.NOT_STARTED && (
              <ProgressBarSection
                finishTime={currentDelivery?.finishTime}
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
              <div style={{ width: '50%', overflow: 'hidden' }}>
                <InventoryChangeCharts
                  inventory={originInventory}
                  deltaMass={-totalMass}
                  deltaVolume={-totalVolume}
                />
              </div>
              <FlexSectionSpacer />
              <div style={{ width: '50%', overflow: 'hidden' }}>
                <InventoryChangeCharts
                  inventory={destinationInventory}
                  deltaMass={totalMass}
                  deltaVolume={totalVolume}
                />
              </div>
            </FlexSection>

            {(originController && destinationController && originController?.id !== destinationController?.id) && (
              <FlexSection>
                <CrewOwnerBlock crew={originController} />

                <FlexSectionSpacer />

                <CrewOwnerBlock crew={destinationController} />
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
        disabled={!destination || totalMass === 0}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onFinalize={onFinishDelivery}
        onGo={onStartDelivery}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <TransferSelectionDialog
            sourceEntity={origin}
            inventory={originInventory?.contents || []}
            initialSelection={selectedItems}
            onClose={() => setTransferSelectorOpen(false)}
            onSelected={setSelectedItems}
            open={transferSelectorOpen}
          />

          <InventorySelectionDialog
            otherEntity={origin}
            otherLotId={originLot?.id}
            onClose={() => setDestinationSelectorOpen(false)}
            onSelected={setDestinationSelection}
            open={destinationSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);

  // entrypoints w/ props:
  //  - actionitem (deliveryId)
  //  - specific entity (entity, selected inventory)
  //  - lot (building, available inventory)
  const deliveryManagerQuery =  props.deliveryId
    ? { deliveryId: props.deliveryId }
    : { origin: props.origin || lot?.building };
  if (props.originSlot) deliveryManagerQuery.originSlot = props.originSlot;

  const deliveryManager = useDeliveryManager(deliveryManagerQuery);

  const currentDeliveryAction = useMemo(() => {
    return (deliveryManager.currentDeliveryActions || []).find((d) => {
      if (props.deliveryId) return d.action.deliveryId === props.deliveryId
      if (props.txHash) return d.action.txHash === props.txHash;
      return d.status === 'DEPARTING';
    });
  }, [deliveryManager.currentVersion]);

  const { data: originEntity, isLoading: originLoading } = useEntity(currentDeliveryAction?.action?.origin || props.origin || lot?.building);
  const { data: originLot, isLoading: originLotLoading } = useLot(locationsArrToObj(originEntity?.Location?.locations || []).lotId);
  const { data: destEntity, isLoading: destLoading } = useEntity(currentDeliveryAction?.action?.dest);

  const stage = currentDeliveryAction?.stage || actionStage.NOT_STARTED;

  useEffect(() => {
    if (!asteroid || !originLot) {
      if (!isLoading && !originLoading && !originLotLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, origin, isLoading, originLoading, originLotLoading]);

  // handle auto-closing on any status change
  const lastStatus = useRef();
  useEffect(() => {
    if (stage !== 'READY_TO_FINISH') {
      if (lastStatus.current && stage !== lastStatus.current) {
        props.onClose();
      }
    }
    if (!deliveryManager.isLoading) {
      lastStatus.current = stage;
    }
  }, [deliveryManager.isLoading, stage]);

  return (
    <ActionDialogInner
      actionImage={surfaceTransferBackground}
      isLoading={reactBool(isLoading || originLoading || originLotLoading || destLoading || deliveryManager.isLoading)}
      stage={stage}>
      <SurfaceTransfer
        asteroid={asteroid}
        deliveryManager={deliveryManager}
        origin={originEntity}
        originLot={originLot}
        originSlot={props.originSlot}
        dest={destEntity}
        currentDelivery={currentDeliveryAction?.action}
        stage={stage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
