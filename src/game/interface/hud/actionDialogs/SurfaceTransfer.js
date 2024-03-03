import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crewmate, Entity, Inventory, Lot, Permission, Product, Time } from '@influenceth/sdk';
import styled from 'styled-components';

import { ForwardIcon, InventoryIcon, LocationIcon, RouteIcon, SurfaceTransferIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses, nativeBool } from '~/lib/utils';
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
  FlexSectionSpacer,
  ActionDialogBody,
  FlexSection,
  TransferSelectionDialog,
  ProgressBarSection,
  ActionDialogTabs,
  InventoryChangeCharts,
  CrewOwnerBlock,
  TransferDistanceDetails,
  FlexSectionBlock,
  WarningAlert,
  SwayInputBlockInner,
  InventorySelectionDialog,
  InventoryInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import useCrew from '~/hooks/useCrew';
import theme from '~/theme';
import CrewIndicator from '~/components/CrewIndicator';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';

const P2PSection = styled.div`
  align-self: flex-start;
  width: 50%;
  & > * {
    margin-bottom: 20px;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const SurfaceTransfer = ({
  asteroid,
  deliveryManager,

  origin,
  originLot,
  originSlot: initialOriginSlot,

  dest,
  currentDeliveryAction,

  stage,
  ...props
}) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { startDelivery, finishDelivery, packageDelivery, acceptDelivery, cancelDelivery } = deliveryManager;
  const currentDelivery = useMemo(() => currentDeliveryAction?.action, [currentDeliveryAction]);
  const { crew, crewCan } = useCrewContext();

  const crewmates = (crew?._crewmates || []);
  const captain = crewmates[0];

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [originSlot, setOriginSlot] = useState(initialOriginSlot);
  const [tab, setTab] = useState(0);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});
  const [sway, setSway] = useState((currentDelivery?.price || 0) / 1e6);
  const [destinationSelection, setDestinationSelection] = useState(
    (currentDelivery && dest && {
      id: dest.id,
      label: dest.label,
      lotIndex: locationsArrToObj(dest.Location?.locations || []).lotIndex,
      slot: currentDelivery.destSlot
    }) || undefined
  );

  useEffect(() => {

  }, [origin, originSlot, dest, currentDeliveryAction, stage]);

  const onSwayChange = useCallback((value) => {
    setSway(value ? parseInt(value) : '');
  }, []);

  // get origin and originInventory
  const [originInventory, originInventoryTally] = useMemo(() => {
    const inventories = (origin?.Inventories || []).filter((i) => i.status === Inventory.STATUSES.AVAILABLE);
    return [
      // if originSlot is specified, use that
      // else, use primary (or first available if no primary)
      originSlot
        ? inventories.find((i) => i.slot === originSlot)
        : inventories.find((i) => Inventory.TYPES[i.inventoryType].category === Inventory.CATEGORIES.PRIMARY) || inventories[0],
      inventories.length
    ];
  }, [origin?.Inventories, originSlot]);
  const { data: originController } = useCrew(origin?.Control?.controller?.id);

  // When a new origin inventory is selected, reset the selected items
  const onOriginSelect = useCallback((selection) => {
    if (originSlot !== selection.slot) {
      setOriginSlot(selection.slot);
      setSelectedItems({});
    }
  }, [originSlot]);

  const onDestinationSelect = useCallback((selection) => {
    const { id, label, slot } = destinationSelection || {};
    if (id !== selection.id || label !== selection.label || slot !== selection.slot) setDestinationSelection(selection);
  }, [destinationSelection]);

  const { data: destination } = useEntity(destinationSelection ? { id: destinationSelection.id, label: destinationSelection.label } : undefined);
  const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  const { data: destinationLot } = useLot(destinationLotId);
  const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === destinationSelection?.slot), [destination, destinationSelection]);
  const { data: destinationController } = useCrew(destination?.Control?.controller?.id);

  const destDeliveryManager = useDeliveryManager({ destination, destinationSlot: destinationSelection?.slot });

  // handle "currentDeliveryAction" state
  useEffect(() => {
    if (currentDelivery) {
      setSelectedItems(currentDelivery.contents.reduce((acc, item) => ({ ...acc, [item.product]: item.amount }), {}));
    }
  }, [currentDelivery]);

  useEffect(() => {
    if (stage === actionStage.NOT_STARTED) {
      const destInvConfig = (Inventory.getType(destinationInventory?.inventoryType, crew?._inventoryBonuses) || {})
      const destInvConstraints = destInvConfig.productConstraints;

      // cap selectedItems to originInventory contents and destinationInventory constraints
      // TODO: account for *pending* deliveries out from origin (i.e. to adjust actual available amount)?
      const validated = Object.keys(selectedItems).reduce((acc, product) => {
        const sendConstraint = ((originInventory?.contents || []).find((c) => Number(c.product) === Number(product))?.amount || 0);
        const inDestMax = destInvConstraints
          ? (Object.keys(destInvConstraints).includes(`${product}`) ? (destInvConstraints[product] === 0 ? Infinity : destInvConstraints[product]) : 0)
          : Infinity;
        const inDestInv = ((destinationInventory?.contents || []).find((c) => Number(c.product) === Number(product))?.amount || 0);
        const inDestTransit = (destDeliveryManager.currentDeliveryActions || [])
          .filter((d) => d.status !== 'FINISHED')
          .reduce((acc, d) => acc + ((d.action.contents.find((c) => Number(c.product) === Number(product))?.amount) || 0), 0);
        const receiveConstraint = Math.max(0, inDestMax - inDestInv - inDestTransit);

        const maxProduct = Math.min(selectedItems[product], sendConstraint, receiveConstraint);
        return maxProduct > 0 ? { ...acc, [product]: maxProduct } : acc;
      }, {});

      // if one item selected and it is over the total mass / volume constraint, also cap (i.e. useful for propellant)
      if (Object.keys(validated).length === 1) {
        const product = Object.keys(validated)[0];
        const massConstraint = destInvConfig.massConstraint - ((destinationInventory?.mass || 0) + (destinationInventory?.reservedMass || 0));
        const volumeConstraint = destInvConfig.volumeConstraint - ((destinationInventory?.volume || 0) + (destinationInventory?.reservedVolume || 0));
        if (Product.TYPES[product].massPerUnit * validated[product] > massConstraint) {
          validated[product] = Math.floor(massConstraint / Product.TYPES[product].massPerUnit);
        }
        if (Product.TYPES[product].volumePerUnit * validated[product] > volumeConstraint) {
          validated[product] = Math.floor(volumeConstraint / Product.TYPES[product].volumePerUnit);
        }
      }

      setSelectedItems(validated);
    }
  }, [crew?._inventoryBonuses, originInventory, destinationInventory, destDeliveryManager.currentDeliveryActions]);

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
  }, [asteroid?.id, originLot?.id, destinationLot?.id, crewTravelBonus, crew?._timeAcceleration]);

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * Product.TYPES[resourceId].massPerUnit;
      acc.totalVolume += selectedItems[resourceId] * Product.TYPES[resourceId].volumePerUnit;
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

  const hasOriginPerm = useMemo(() => !origin || crewCan(Permission.IDS.REMOVE_PRODUCTS, origin), [origin, crew]);
  const hasDestPerm = useMemo(() => !destination || crewCan(Permission.IDS.ADD_PRODUCTS, destination), [destination, crew]);
  const isP2P = useMemo(() => !(hasOriginPerm && hasDestPerm), [hasOriginPerm, hasDestPerm]);

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

  const willBeOverCapacity = useMemo(() => {
    const destInventoryConfig = Inventory.getType(destinationInventory?.inventoryType, crew?._inventoryBonuses) || {};
    if (destinationInventory) {
      destInventoryConfig.massConstraint -= ((destinationInventory.mass || 0) + (destinationInventory.reservedMass || 0));
      destInventoryConfig.volumeConstraint -= ((destinationInventory.volume || 0) + (destinationInventory.reservedVolume || 0));
    }
    return (totalMass > destInventoryConfig.massConstraint) || (totalVolume > destInventoryConfig.volumeConstraint);
  }, [crew?._inventoryBonuses, destinationInventory, totalMass, totalVolume]);

  const onStartDelivery = useCallback(() => {
    if (willBeOverCapacity) {
      const destInventoryConfig = Inventory.getType(destinationInventory?.inventoryType, crew?._inventoryBonuses) || {};
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: `Insufficient inventory capacity at destination: ${formatSampleMass(destInventoryConfig.massConstraint)} tonnes or ${formatSampleVolume(destInventoryConfig.volumeConstraint)} m³` },
        duration: 10000
      });
      return;
    }

    ((isP2P && hasOriginPerm) ? packageDelivery : startDelivery)({
      origin,
      originSlot: originInventory?.slot,
      destination,
      destinationSlot: destinationInventory?.slot,
      contents: selectedItems,
      price: sway
    }, { asteroidId: asteroid?.id, lotId: originLot?.id });
  }, [crew?._inventoryBonuses, packageDelivery, startDelivery, originInventory, destinationInventory, selectedItems, sway, isP2P, hasOriginPerm, asteroid?.id, originLot?.id, willBeOverCapacity]);

  const onFinishDelivery = useCallback(() => {
    finishDelivery(props.deliveryId, {
      asteroidId: asteroid?.id,
      lotId: destinationLot?.id,
    });
  }, [finishDelivery, props.deliveryId, asteroid?.id, destinationLot?.id]);

  const onCancelDelivery = useCallback(() => {
    cancelDelivery(props.deliveryId, {
      asteroidId: asteroid?.id,
      lotId: destinationLot?.id,
    });
  }, [cancelDelivery, props.deliveryId, asteroid?.id, destinationLot?.id]);

  const onAcceptDelivery = useCallback(() => {
    acceptDelivery(props.deliveryId, {
      asteroidId: asteroid?.id,
      lotId: destinationLot?.id,
    });
  }, [acceptDelivery, props.deliveryId, asteroid?.id, destinationLot?.id]);

  const actionDetails = useMemo(() => {
    let overrideColor = undefined;
    let status = undefined;
    if (stage === actionStage.NOT_STARTED || ['READY','PACKAGED'].includes(currentDeliveryAction?.status)) {
      if (isP2P) {
        if (hasDestPerm) {
          status = 'Incoming from Other Crew';
          overrideColor = '#faaf3f';
        } else {
          status = 'Send to Crew';
          overrideColor = theme.colors.green;
        }
      } else {
        status = 'Send Items';
        overrideColor = theme.colors.main;
      }
    }
    return { overrideColor, status, stage };
  }, [crew, currentDeliveryAction?.status, destination, isP2P, hasDestPerm, stage]);

  const finalizeActions = useMemo(() => {
    if (currentDeliveryAction?.status === 'PACKAGED') {
      if (hasDestPerm) {
        return {
          finalizeLabel: 'Accept Proposal',
          onFinalize: onAcceptDelivery,
        };
      } else {
        return {
          finalizeLabel: 'Cancel Proposal',
          onFinalize: onCancelDelivery,
        };
      }
    }
    return {
      finalizeLabel: 'Complete',
      onFinalize: onFinishDelivery,
    };
  }, [currentDeliveryAction?.status, crew, hasDestPerm, onAcceptDelivery, onCancelDelivery, onFinishDelivery]);

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
            disabled={stage !== actionStage.NOT_STARTED || originInventoryTally === 1}
            entity={origin}
            inventorySlot={originInventory?.slot}
            inventoryBonuses={crew?._inventoryBonuses}
            isSelected={stage === actionStage.NOT_STARTED && originInventoryTally !== 1}
            onClick={() => { setOriginSelectorOpen(true) }} />

          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <InventoryInputBlock
            title="Destination"
            titleDetails={<TransferDistanceDetails distance={transportDistance} crewTravelBonus={crewTravelBonus} />}
            disabled={stage !== actionStage.NOT_STARTED}
            entity={destination}
            inventorySlot={destinationInventory?.slot}
            inventoryBonuses={crew?._inventoryBonuses}
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
            {(!destinationLot || !isP2P)
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

                  {/* TODO: might be reasonable to warn user if about to send products to a place have ADD_PRODUCTS perm for, but not REMOVE_PRODUCTS */}
                  <P2PSection>
                    {hasOriginPerm
                      ? (
                        <>
                          <CrewIndicator crew={destinationController} label={'Destination Controller'} />

                          <WarningAlert severity="warning">
                            <div><WarningOutlineIcon /></div>
                            <div>The destination is controlled by a different crew.</div>
                          </WarningAlert>

                          {(stage === actionStage.NOT_STARTED || ['PACKAGING','PACKAGED','CANCELING'].includes(currentDeliveryAction?.status)) && (
                            <SwayInputBlockInner
                              disabled={nativeBool(stage !== actionStage.NOT_STARTED)}
                              inputLabel="REQUESTED SWAY"
                              instruction="OPTIONAL: You may request a SWAY payment from the controlling crew in exchange for goods delivered."
                              onChange={onSwayChange}
                              value={sway} />
                          )}
                        </>
                      )
                      : (
                        <>
                          <CrewIndicator crew={originController} label={'Origin Controller'} />

                          {sway > 0 && (
                            <WarningAlert severity="error">
                              <div><WarningOutlineIcon /></div>
                              <div>The sender has requested a SWAY payment for these goods.</div>
                            </WarningAlert>
                          )}

                          {(stage === actionStage.NOT_STARTED || ['PACKAGING','PACKAGED','CANCELING'].includes(currentDeliveryAction?.status)) && (
                            <SwayInputBlockInner
                              disabled
                              inputLabel="SWAY"
                              instruction="You pay the controller in exchange for these goods:"
                              value={sway} />
                          )}
                        </>
                      )}
                  </P2PSection>

                </FlexSection>
              )
            }

            {stage !== actionStage.NOT_STARTED && currentDeliveryAction?.status !== 'PACKAGED' && (
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
                  inventoryBonuses={crew?._inventoryBonuses}
                  deltaMass={-totalMass}
                  deltaVolume={-totalVolume}
                />
              </div>
              <FlexSectionSpacer />
              <div style={{ width: '50%', overflow: 'hidden' }}>
                <InventoryChangeCharts
                  inventory={destinationInventory}
                  inventoryBonuses={crew?._inventoryBonuses}
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
        disabled={stage === actionStage.NOT_STARTED && (totalMass === 0 || !destination || willBeOverCapacity || !crewCan(Permission.IDS.ADD_PRODUCTS, destination))}
        goLabel="Transfer"
        onGo={onStartDelivery}
        stage={stage}
        waitForCrewReady
        {...finalizeActions}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <TransferSelectionDialog
            sourceEntity={origin}
            sourceContents={originInventory?.contents || []}
            pendingTargetDeliveries={destDeliveryManager.currentDeliveryActions}
            targetInventory={destinationInventory}
            initialSelection={selectedItems}
            inventoryBonuses={crew?._inventoryBonuses}
            onClose={() => setTransferSelectorOpen(false)}
            onSelected={setSelectedItems}
            open={transferSelectorOpen}
          />

          <InventorySelectionDialog
            asteroidId={asteroid.id}
            isSourcing
            onClose={() => setOriginSelectorOpen(false)}
            onSelected={onOriginSelect}
            open={originSelectorOpen}
            limitToPrimary={origin}
          />

          <InventorySelectionDialog
            asteroidId={asteroid.id}
            otherEntity={origin}
            otherInvSlot={originInventory?.slot}
            onClose={() => setDestinationSelectorOpen(false)}
            onSelected={onDestinationSelect}
            open={destinationSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  // entrypoints w/ props:
  //  - actionitem (deliveryId)
  //  - specific entity (entity, selected inventory)
  //  - lot (building, available inventory)
  const deliveryManagerQuery = props.deliveryId
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

  const zoomShip = useMemo(
    () => zoomScene?.type === 'SHIP' && zoomScene?.shipId
      ? { label: Entity.IDS.SHIP, id: zoomScene.shipId }
      : undefined,
    [zoomScene]
  );

  const { data: originEntity, isLoading: originLoading } = useEntity(
    currentDeliveryAction?.action?.origin || props.origin || zoomShip || lot?.surfaceShip || lot?.building);

  const { data: originLot, isLoading: originLotLoading } = useLot(
    locationsArrToObj(originEntity?.Location?.locations || []).lotId);

  const { data: destEntity, isLoading: destLoading } = useEntity(currentDeliveryAction?.action?.dest);

  const stage = currentDeliveryAction?.stage || actionStage.NOT_STARTED;

  useEffect(() => {
    if (!asteroid || !originLot) {
      if (!isLoading && !originLoading && !originLotLoading && !deliveryManager.isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, origin, isLoading, originLoading, originLotLoading, deliveryManager.isLoading]);

  // handle auto-closing on any status change
  const lastStatus = useRef();
  useEffect(() => {
    if (stage !== 'READY_TO_FINISH') {
      if (lastStatus.current && stage !== lastStatus.current) {
        if (props.onClose) props.onClose();
      }
    }
    if (!deliveryManager.isLoading) {
      lastStatus.current = stage;
    }
  }, [deliveryManager.isLoading, stage]);

  return (
    <ActionDialogInner
      actionImage="SurfaceTransfer"
      isLoading={reactBool(isLoading || originLoading || originLotLoading || destLoading || deliveryManager.isLoading)}
      stage={currentDeliveryAction?.status === 'PACKAGED' ? actionStage.NOT_STARTED : stage}>
      <SurfaceTransfer
        asteroid={asteroid}
        deliveryManager={deliveryManager}
        origin={originEntity}
        originLot={originLot}
        originSlot={props.originSlot}
        dest={destEntity}
        currentDeliveryAction={currentDeliveryAction}
        stage={stage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
