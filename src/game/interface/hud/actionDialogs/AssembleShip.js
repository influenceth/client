import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Crewmate, Lot, Product, Ship, Time } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CaretIcon, CloseIcon, ForwardIcon, ConstructShipIcon, ProcessIcon, InventoryIcon, LocationIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses, formatFixed } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  FlexSection,
  FlexSectionSpacer,
  FlexSectionBlock,
  FlexSectionInputBody,
  sectionBodyCornerSize,
  RecipeSlider,
  TransferDistanceDetails,
  ProcessInputSquareSection,
  formatMass,
  ProcessSelectionDialog,
  LotInputBlock,
  TravelBonusTooltip,
  getTripDetails,
  getBonusDirection,
  TimeBonusTooltip,
  InventorySelectionDialog,
  InventoryInputBlock,
  ShipImage
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';
import useDryDockManager from '~/hooks/actionManagers/useDryDockManager';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';

const SECTION_WIDTH = 1046;

const SelectorInner = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: row;
  font-size: 18px;
  & label {
    flex: 1;
    font-weight: bold;
    padding-left: 10px;
  }
`;
const IconWrapper = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
  ${p => p.theme.clipCorner(sectionBodyCornerSize * 0.6)};
  display: flex;
  font-size: 30px;
  height: 50px;
  justify-content: center;
  width: 50px;
`;
const RightIconWrapper = styled.div``;


const shipContructionProcesses = [Ship.IDS.SHUTTLE, Ship.IDS.LIGHT_TRANSPORT, Ship.IDS.HEAVY_TRANSPORT].map((i) => ({
  i,
  name: `${Ship.TYPES[i].name} Integration`,
  inputs: Ship.CONSTRUCTION_TYPES[i].requirements,
  outputs: null,
  batched: false,
  setupTime: Ship.CONSTRUCTION_TYPES[i].setupTime,
  recipeTime: Ship.CONSTRUCTION_TYPES[i].constructionTime
}));

const AssembleShip = ({ asteroid, lot, dryDockManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentAssembly, assemblyStatus, startShipAssembly, finishShipAssembly } = dryDockManager;

  const { crew } = useCrewContext();

  const [selectedOrigin, setSelectedOrigin] = useState(currentAssembly ? { ...currentAssembly?.origin, slot: currentAssembly?.originSlot } : undefined);
  const { data: origin } = useEntity(selectedOrigin);
  const originLotId = useMemo(() => origin && locationsArrToObj(origin?.Location?.locations || []).lotId, [origin]);
  const { data: originLot } = useLot(originLotId);
  const originSlot = selectedOrigin?.slot;
  // TODO: is both below and above needed? just using below in other Process action dialogs...
  const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => i.slot === selectedOrigin?.slot), [origin, selectedOrigin?.slot]);

  const [selectedDestination, setSelectedDestination] = useState(currentAssembly ? { ...currentAssembly?.destination, slot: currentAssembly?.destinationSlot } : undefined);
  const { data: destination } = useEntity(selectedDestination);
  const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  const { data: destinationLot } = useLot(destinationLotId);
  const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === selectedDestination?.slot), [destination, selectedDestination?.slot]);

  const amount = 1;
  const [shipType, setShipType] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [processSelectorOpen, setProcessSelectorOpen] = useState(false);

  // TODO: if shipType is changed, reset origin and originSlot?
  //  or at least re-eval which inputs are available in grid

  const process = shipType && shipContructionProcesses.find((p) => p.i === shipType);
  const ship = useMemo(() => {
    if (!shipType) return null;
    return {
      ...Ship.TYPES[shipType],
      ...Ship.CONSTRUCTION_TYPES[shipType],
    }
  }, [shipType]);

  const crewmates = currentAssembly?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];

  const [crewTravelBonus, assemblyTimeBonus] = useMemo(() => {
    const bonusIds = [
      Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
      Crewmate.ABILITY_IDS.SHIP_INTEGRATION_TIME,
    ];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const assemblyTime = useMemo(() => {
    if (!ship) return 0;
    return Time.toRealDuration(ship?.constructionTime * assemblyTimeBonus.totalBonus, crew?._timeAcceleration);
  }, [amount, crew?._timeAcceleration, assemblyTimeBonus, ship?.constructionTime]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Dry Dock', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus]);

  const [inputTransportDistance, inputTransportTime] = useMemo(() => {
    if (!originLot?.id) return [];
    return [
      Asteroid.getLotDistance(asteroid?.id, Lot.toIndex(originLot?.id), Lot.toIndex(lot?.id)) || 0,
      Time.toRealDuration(
        Asteroid.getLotTravelTime(asteroid?.id, Lot.toIndex(originLot?.id), Lot.toIndex(lot?.id), crewTravelBonus.totalBonus) || 0,
        crew?._timeAcceleration
      )
    ];
  }, [asteroid?.id, lot?.id, crew?._timeAcceleration, originLot?.id, crewTravelBonus]);

  const [outputTransportDistance, outputTransportTime] = useMemo(() => {
    if (!destinationLot?.id) return [];
    return [
      Asteroid.getLotDistance(asteroid?.id, Lot.toIndex(lot?.id), Lot.toIndex(destinationLot?.id)) || 0,
      Time.toRealDuration(
        Asteroid.getLotTravelTime(asteroid?.id, Lot.toIndex(lot?.id), Lot.toIndex(destinationLot?.id), crewTravelBonus.totalBonus) || 0,
        crew?._timeAcceleration
      )
    ];
  }, [asteroid?.id, lot?.id, crew?._timeAcceleration, destinationLot?.id, crewTravelBonus]);

  const [inputArr, inputMass, inputVolume] = useMemo(() => {
    if (!process || !amount) return [[], 0, 0, [], 0, 0];
    const inputArr = Object.keys(process?.inputs || {}).map(Number);
    return [
      inputArr,
      inputArr.reduce((sum, i) => sum + process.inputs[i] * (Product.TYPES[i].massPerUnit || 0), 0),
      inputArr.reduce((sum, i) => sum + process.inputs[i] * (Product.TYPES[i].volumePerUnit || 0), 0),
    ];
  }, [process]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    const onewayCrewTravelTime = crewTravelTime / 2;
    const setupTime = ship?.setupTime || 0;
    return [
      Math.max(onewayCrewTravelTime, inputTransportTime) + setupTime + onewayCrewTravelTime,
      Math.max(onewayCrewTravelTime, inputTransportTime) + setupTime + assemblyTime
    ];
  }, [crewTravelTime, inputTransportTime, ship?.setupTime, assemblyTime]);

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TravelBonusTooltip
          bonus={crewTravelBonus}
          totalTime={crewTravelTime}
          tripDetails={tripDetails}
          crewRequired="start" />
      )
    },
    {
      label: 'Assembly Time',
      value: formatTimer(assemblyTime),
      direction: getBonusDirection(assemblyTimeBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={assemblyTimeBonus}
          title="Assembly Time"
          totalTime={assemblyTime}
          crewRequired="start" />
      )
    },
    {
      label: 'Transport Distance',
      value: `${formatFixed(inputTransportDistance, 1)} km`,
      direction: 0
    },
    {
      label: 'Transport Time',
      value: formatTimer(inputTransportTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
          title="Transport Time"
          totalTime={inputTransportTime}
          crewRequired="start" />
      )
    },
  ]), [assemblyTime, assemblyTimeBonus, crewTravelTime, crewTravelBonus, tripDetails, inputTransportDistance, inputTransportTime]);

  const onAssemble = useCallback(() => {
    startShipAssembly(shipType, origin, originSlot);
  }, [shipType, origin, originSlot]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (assemblyStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = assemblyStatus;
  }, [assemblyStatus]);

  const isOriginSufficient = useMemo(() => {
    if (!originInventory) return false;
    const sourceContentObj = (originInventory?.contents || []).reduce((acc, cur) => ({ ...acc, [cur.product]: cur.amount }), {});
    return !inputArr.find((i) => (sourceContentObj[i] || 0) < process.inputs[i]);
  }, [inputArr, originInventory?.contents, process]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <ConstructShipIcon />,
          label: 'Assemble Ship',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage}
        wide />

      <ActionDialogBody>
        <FlexSection style={{ marginBottom: 32, width: SECTION_WIDTH }}>
          <LotInputBlock
            lot={lot}
            title="Construction Location"
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ width: 350 }}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock
            title="Process"
            bodyStyle={{ padding: 0 }}
            style={{ alignSelf: 'flex-start', width: '592px' }}>

            <FlexSectionInputBody
              isSelected={true}
              onClick={() => setProcessSelectorOpen(true)}
              style={{ padding: 4 }}>
              <SelectorInner>
                <IconWrapper>
                  <ProcessIcon />
                </IconWrapper>
                <label>{process?.name || `Select a Process...`}</label>
                {process ? <IconButton borderless><CloseIcon /></IconButton> : <CaretIcon />}
              </SelectorInner>
              <ClipCorner dimension={sectionBodyCornerSize} />
            </FlexSectionInputBody>

            <RecipeSlider
              amount={1}
              disabled
              overrideSliderLabel={<div><b style={{ color: 'white' }}>1</b> Ship</div>}
              processingTime={assemblyTime || 0}
              min={0}
              max={1}
            />
          </FlexSectionBlock>
        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <div style={{ width: 350 }}>
            <InventoryInputBlock
              title="Input Inventory"
              titleDetails={<TransferDistanceDetails distance={inputTransportDistance} crewTravelBonus={crewTravelBonus} />}
              disabled={!shipType || stage !== actionStages.NOT_STARTED}
              entity={origin}
              inventorySlot={selectedOrigin?.slot}
              imageProps={{
                iconOverride: <InventoryIcon />,
              }}
              isSelected={shipType && stage === actionStages.NOT_STARTED}
              onClick={() => { setOriginSelectorOpen(true) }}
              style={{ marginBottom: 20, width: '100%' }}
              sublabel={
                originLot
                ? <><LocationIcon /> {formatters.lotName(selectedOrigin?.lotIndex)}</>
                : 'Inventory'
              }
              transferMass={0/* TODO */}
              transferVolume={0/* TODO */} />

            <InventoryInputBlock
              title="Delivery Destination"
              titleDetails={<TransferDistanceDetails distance={outputTransportDistance} crewTravelBonus={crewTravelBonus} />}
              disabled={stage !== actionStages.READY_TO_COMPLETE}
              entity={destination}
              inventorySlot={selectedDestination?.slot}
              imageProps={{
                iconOverride: <InventoryIcon />,
              }}
              isSelected={stage === actionStages.READY_TO_COMPLETE}
              label="Select"
              onClick={() => { setDestinationSelectorOpen(true) }}
              style={{ marginBottom: 20, width: '100%' }}
              sublabel={
                destinationLot
                ? <><LocationIcon /> {formatters.lotName(selectedDestination?.lotIndex)}</>
                : 'Inventory'
              }
              fallbackSublabel={stage !== actionStages.READY_TO_COMPLETE ? 'Upon Completion' : 'Inventory'}
              transferMass={0/* TODO */}
              transferVolume={0/* TODO */} />
          </div>
          
          <FlexSectionSpacer style={{ alignItems: 'flex-start', paddingTop: '54px' }}>
            <ForwardIcon />
          </FlexSectionSpacer>

          <div style={{ alignSelf: 'flex-start', width: '280px' }}>
            <ProcessInputSquareSection
              input
              title={
                process
                  ? <>Required: <b style={{ color: 'white', marginLeft: 4 }}>{inputArr.length || 0} Products</b></>
                  : `Requirements`
              }
              products={
                process
                  ? inputArr.map((i) => ({ i, recipe: process.inputs[i], amount: process.inputs[i] * amount }))
                  : []
              }
              source={originInventory}
              style={{ width: '100%' }} />
          </div>
          
          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', height: '280px', width: '280px' }}>
            <FlexSectionBlock
              title={ship ? <>Produced: <b style={{ color: 'white', marginLeft: 4 }}>1 Ship</b></> : `Production`}
              bodyStyle={{ alignItems: 'center', display: 'flex', height: '252px', justifyContent: 'center', padding: 0 }}
              style={{ width: '100%' }}>
                {shipType && (
                  <ShipImage
                    iconBadge={`+${formatMass(ship.hullMass)}`}
                    iconBadgeColor={theme.colors.green}
                    shipType={shipType}
                    size="w400"
                    style={{
                      background: `rgba(${hexToRGB(theme.colors.green)}, 0.15)`,
                      borderColor: `rgba(${hexToRGB(theme.colors.green)}, 0.15)`,
                      height: 175,
                      width: 250,
                    }} />
                )}
            </FlexSectionBlock>
          </div>
        </FlexSection>

        {stage !== actionStages.NOT_STARTED && null /* TODO: (
          <ProgressBarSection
            finishTime={lot?.building?.construction?.finishTime}
            startTime={lot?.building?.construction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + constructionTime}
          />
        )*/}

        <ActionDialogStats
          stage={stage}
          stats={stats}
          wide
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!(
          (stage === actionStages.NOT_STARTED && process && originInventory && isOriginSufficient)
          || (stage === actionStages.READY_TO_COMPLETE && destinationInventory)
        )}
        finalizeLabel="Deliver Ship"
        goLabel="Begin Assembly"
        onGo={onAssemble}
        stage={stage}
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <>
          <ProcessSelectionDialog
            initialSelection={shipType}
            forceProcesses={shipContructionProcesses}
            onClose={() => setProcessSelectorOpen(false)}
            onSelected={setShipType}
            open={processSelectorOpen}
          />

          <InventorySelectionDialog
            otherEntity={lot.building}
            otherLotId={lot?.id}
            isSourcing
            itemIds={inputArr}
            onClose={() => setOriginSelectorOpen(false)}
            onSelected={setSelectedOrigin}
            open={originSelectorOpen}
            requirePresenceOfItemIds
          />
        </>
      )}
      {stage === actionStages.READY_TO_COMPLETE && (
        <InventorySelectionDialog
          otherEntity={lot.building}
          otherLotId={lot?.id}
          onClose={() => setDestinationSelectorOpen(false)}
          onSelected={setSelectedDestination}
          open={destinationSelectorOpen}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const dryDockManager = useDryDockManager(lot?.id);
  const { actionStage } = dryDockManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={reactBool(isLoading)}
      stage={actionStage}
      extraWide>
      <AssembleShip
        asteroid={asteroid}
        lot={lot}
        dryDockManager={dryDockManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;