import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Building, Crew, Crewmate, Inventory, Product } from '@influenceth/sdk';
import styled from 'styled-components';

import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import { ForwardIcon, InventoryIcon, LocationIcon, RouteIcon, SurfaceTransferIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer } from '~/lib/utils';
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
  TransferDistanceDetails,
  FlexSectionBlock,
  WarningAlert,
  SwayInputBlock,
  SwayInputBlockInner,
  LotInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import useCrew from '~/hooks/useCrew';
import theme from '~/theme';
import CrewIndicator from '~/components/CrewIndicator';

const Overloaded = styled.div`
  color: ${p => p.theme.colors.error};
  font-size: 12px;
  margin-top: 6px;
  text-transform: uppercase;
`;

const SurfaceTransfer = ({ asteroid, lot, deliveryManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { currentDeliveryAction, deliveryStatus, startDelivery, finishDelivery } = deliveryManager;
  const { crew, crewmateMap } = useCrewContext();
  const { data: currentDeliveryOriginLot } = useLot(asteroid.i, currentDeliveryAction?.originLotId);
  const { data: currentDeliveryDestinationLot } = useLot(asteroid.i, currentDeliveryAction?.destLotId);

  const originLot = useMemo(
    () => (currentDeliveryAction ? currentDeliveryOriginLot : lot) || {},
    [currentDeliveryAction, currentDeliveryOriginLot, lot]
  );
  const [destinationLot, setDestinationLot] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});
  const [tab, setTab] = useState(0);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();

  const { data: originLotOccupier } = useCrew(originLot?.building?.Control?.controller?.id);
  const { data: destinationLotOccupier } = useCrew(destinationLot?.building?.Control?.controller?.id);

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
    if (currentDeliveryDestinationLot) {
      setDestinationLot(currentDeliveryDestinationLot);
    }
  }, [currentDeliveryDestinationLot]);

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

  const destinationOverloaded = useMemo(() => {
    const showInventoryStatusForType = 1; // TODO: ...
    if (destinationLot?.building?.Inventories) {
      const capacity = getCapacityUsage(destinationLot.building.Inventories, showInventoryStatusForType);
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
        content: `Insufficient capacity remaining at selected destination: ${formatSampleMass(destInventoryConfig.massConstraint)} tonnes or ${formatSampleVolume(destInventoryConfig.volumeConstraint)} m³`,
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

  const actionDetails = useMemo(() => {
    let overrideColor = undefined;
    let status = undefined;
    if (stage === actionStage.NOT_STARTED) {
      if (destinationLot && destinationLot?.building?.Control?.controller?.id !== crew?.i) {
        status = 'Send to Crew';
        overrideColor = theme.colors.green;
      } else {
        status = 'Send Items';
        overrideColor = theme.colors.main;
      }
    }
    return { overrideColor, status };
  }, [crew, destinationLot, stage]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <SurfaceTransferIcon />,
          label: 'Surface Transfer',
          status: actionDetails.status
        }}
        captain={captain}
        location={{ asteroid, lot }}
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
          <LotInputBlock
            title="Origin"
            lot={lot}
            imageProps={{
              inventories: lot.building?.Inventories,
              showInventoryStatusForType: 1
            }}
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <LotInputBlock
            title="Destination"
            titleDetails={<TransferDistanceDetails distance={transportDistance} />}
            lot={destinationLot}
            imageProps={{
              error: destinationOverloaded,
              iconOverride: <InventoryIcon />,
              inventories: destinationLot?.building?.Inventories,
              showInventoryStatusForType: 1
            }}
            isSelected={stage === actionStage.NOT_STARTED}
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
            {(!destinationLot || destinationLot?.building?.Control?.controller?.id === crew?.i)
              ? (
                <ItemSelectionSection
                  label="Transfer Items"
                  items={selectedItems}
                  onClick={stage === actionStage.NOT_STARTED && (() => setTransferSelectorOpen(true))}
                  stage={stage} />
              )
              : (
                <FlexSection>
                  <FlexSectionBlock title="Offered Items" bodyStyle={{ height: 'auto', padding: 0 }}>
                    <ItemSelectionSection
                      columns={3}
                      label="Transfer Items"
                      items={selectedItems}
                      onClick={stage === actionStage.NOT_STARTED && (() => setTransferSelectorOpen(true))}
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
                finishTime={currentDeliveryAction?.finishTime}
                startTime={currentDeliveryAction?.startTime}
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

            {(originLot && destinationLot && originLotOccupier?.i !== destinationLotOccupier?.i) && (
              <FlexSection>
                <CrewOwnerBlock crew={originLotOccupier} />

                <FlexSectionSpacer />

                <CrewOwnerBlock crew={destinationLotOccupier} />
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
      isLoading={reactBool(isLoading)}
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
