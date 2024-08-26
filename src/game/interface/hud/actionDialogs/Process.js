import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Crewmate, Lot, Permission, Process, Processor, Product, Time } from '@influenceth/sdk';

import {
  BackIcon,
  CaretIcon,
  CloseIcon,
  ForwardIcon,
  RefineIcon,
  ProductionIcon,
  GrowIcon,
  AssembleIcon,
  InventoryIcon,
  LocationIcon,
  ManufactureIcon
} from '~/components/Icons';
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
  formatMass,
  ProcessSelectionDialog,
  LotInputBlock,
  TravelBonusTooltip,
  getTripDetails,
  getBonusDirection,
  TimeBonusTooltip,
  InventorySelectionDialog,
  InventoryInputBlock,
  ProcessInputOutputSection,
  formatVolume,
  ProgressBarSection
} from './components';
import useLot from '~/hooks/useLot';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';
import useProcessManager from '~/hooks/actionManagers/useProcessManager';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';
import useActionCrew from '~/hooks/useActionCrew';

const SECTION_WIDTH = 1150;

const SelectorInner = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 18px;
  & label {
    flex: 1;
    padding-left: 10px;
  }
`;
const IconWrapper = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
  ${p => p.theme.clipCorner(sectionBodyCornerSize * 0.6)};
  display: flex;
  font-size: 40px;
  height: 50px;
  justify-content: center;
  width: 50px;
`;

const ProcessIO = ({ asteroid, lot, processorSlot, processManager, stage, ...props }) => {
  const { currentProcess, processStatus, startProcess, finishProcess } = processManager;
  const processor = useMemo(
    () => (lot?.building?.Processors || []).find((e) => e.slot === processorSlot) || {},
    [lot?.building, processorSlot]
  );
  const crew = useActionCrew(currentProcess);
  const { crewCan } = useCrewContext();

  const [selectedOrigin, setSelectedOrigin] = useState(currentProcess ? { ...currentProcess?.origin, slot: currentProcess?.originSlot } : undefined);
  const { data: origin } = useEntity(selectedOrigin);
  const originLotId = useMemo(() => origin && locationsArrToObj(origin?.Location?.locations || []).lotId, [origin]);
  const originLotIndex = useMemo(() => Lot.toIndex(originLotId), [originLotId]);
  const { data: originLot } = useLot(originLotId);
  const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => i.slot === selectedOrigin?.slot), [origin, selectedOrigin?.slot]);

  const [selectedDestination, setSelectedDestination] = useState(currentProcess ? { ...currentProcess?.destination, slot: currentProcess?.destinationSlot } : undefined);
  const { data: destination } = useEntity(selectedDestination);
  const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  const destinationLotIndex = useMemo(() => Lot.toIndex(destinationLotId), [destinationLotId]);
  const { data: destinationLot } = useLot(destinationLotId);
  const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === selectedDestination?.slot), [destination, selectedDestination?.slot]);

  const [amount, setAmount] = useState(currentProcess?.recipeTally || 1);
  const [processId, setProcessId] = useState(currentProcess?.processId);
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [processSelectorOpen, setProcessSelectorOpen] = useState(false);
  const [primaryOutput, setPrimaryOutput] = useState(currentProcess?.primaryOutputId);

  const process = Process.TYPES[processId];

  const { recipeStepSize } = useMemo(() => {
    if (process) {
      const placesAfterDecimal = Math.ceil(Math.log10(Math.max(...Object.values(process.outputs))));
      const recipeStepSize = 1 / Math.pow(10, placesAfterDecimal);
      return { placesAfterDecimal, recipeStepSize };
    }

    return { placesAfterDecimal: 3, recipeStepSize: 0.001 };
  }, [process]);

  useEffect(() => {
    if (currentProcess && !selectedOrigin) {
      setSelectedOrigin({ ...currentProcess?.origin, slot: currentProcess?.originSlot })
    }
  }, [currentProcess]);

  const maxAmount = useMemo(() => {
    let maxPossible = 1;

    if (process) maxPossible = Math.floor((365 * 86400) / process.recipeTime);
    if (process && originInventory) {
      Object.entries(process.inputs).forEach(([i, amount]) => {
        const matching = originInventory.contents.find((c) => Number(c.product) === Number(i));
        if (matching) maxPossible = Math.min(maxPossible, matching.amount / amount);
      });
    }

    return Math.floor(maxPossible / recipeStepSize) * recipeStepSize;
  }, [process, originInventory]);

  // Ensure amount is within bounds when origin inventory or recipe changes
  useEffect(() => {
    // For actions that are already in progress etc., just trust the recipeTally for amount.
    // The maxAmount (which depends on *current* origin inventory stock) is not relevant in that case.
    if (stage !== actionStages.NOT_STARTED) return;
    if (amount > maxAmount) setAmount(maxAmount);
    if (amount < recipeStepSize) setAmount(recipeStepSize);
  }, [recipeStepSize, maxAmount, stage]);

  useEffect(() => {
    if (!process) return;
    if (currentProcess) return;
    setPrimaryOutput(Number(Object.keys(process.outputs)[0]));
    setAmount(1);
  }, [currentProcess, process]);

  const [crewTravelBonus, crewDistBonus, processingTimeBonus, secondaryOutputsBonus] = useMemo(() => {
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE];
    if (processor.processorType === Processor.IDS.BIOREACTOR) {
      bonusIds.push(Crewmate.ABILITY_IDS.REACTION_TIME);
    } else if (processor.processorType === Processor.IDS.REFINERY) {
      bonusIds.push(Crewmate.ABILITY_IDS.REFINING_TIME);
    } else {
      bonusIds.push(Crewmate.ABILITY_IDS.MANUFACTURING_TIME);
    }
    bonusIds.push(Crewmate.ABILITY_IDS.SECONDARY_REFINING_YIELD);
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const [setupTime, processingTime] = useMemo(() => {
    if (!process) return [0, 0];
    return [
      Time.toRealDuration(Process.getSetupTime(processId, processingTimeBonus.totalBonus), crew?._timeAcceleration),
      Time.toRealDuration(Process.getProcessingTime(processId, amount, processingTimeBonus.totalBonus), crew?._timeAcceleration),
    ];
  }, [amount, crew?._timeAcceleration, process, processingTimeBonus]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewDistBonus, crewLotIndex, [
      { label: 'Travel to Processor', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus, crewDistBonus]);

  const [inputTransportDistance, inputTransportTime] = useMemo(() => {
    if (!originLot?.id) return [];
    return [
      Asteroid.getLotDistance(asteroid?.id, Lot.toIndex(originLot?.id), Lot.toIndex(lot?.id)) || 0,
      Time.toRealDuration(
        Asteroid.getLotTravelTime(
          asteroid?.id,
          Lot.toIndex(originLot?.id),
          Lot.toIndex(lot?.id),
          crewTravelBonus.totalBonus,
          crewDistBonus.totalBonus
        ) || 0,
        crew?._timeAcceleration
      )
    ];
  }, [asteroid?.id, lot?.id, crew?._timeAcceleration, originLot?.id, crewDistBonus, crewTravelBonus]);

  const [outputTransportDistance, outputTransportTime] = useMemo(() => {
    if (!destinationLot?.id) return [];
    return [
      Asteroid.getLotDistance(asteroid?.id, Lot.toIndex(lot?.id), Lot.toIndex(destinationLot?.id)) || 0,
      Time.toRealDuration(
        Asteroid.getLotTravelTime(
          asteroid?.id,
          Lot.toIndex(lot?.id),
          Lot.toIndex(destinationLot?.id),
          crewTravelBonus.totalBonus,
          crewDistBonus.totalBonus
        ) || 0,
        crew?._timeAcceleration
      )
    ];
  }, [asteroid?.id, lot?.id, crew?._timeAcceleration, destinationLot?.id, crewDistBonus, crewTravelBonus]);

  const [inputArr, inputMass, inputVolume, outputArr, outputMass, outputVolume] = useMemo(() => {
    if (!process || !amount) return [[], 0, 0, [], 0, 0];
    const inputArr = Object.keys(process.inputs || {}).map(Number);
    const outputArr = Process.getOutputs(processId, amount, primaryOutput, secondaryOutputsBonus?.totalBonus);

    return [
      inputArr,
      inputArr.reduce((sum, i) => sum + process.inputs[i] * amount * (Product.TYPES[i].massPerUnit || 0), 0),
      inputArr.reduce((sum, i) => sum + process.inputs[i] * amount * (Product.TYPES[i].volumePerUnit || 0), 0),
      outputArr,
      outputArr.reduce((sum, o) => sum + o.amount * (Product.TYPES[o.id].massPerUnit || 0), 0),
      outputArr.reduce((sum, o) => sum + o.amount * (Product.TYPES[o.id].volumePerUnit || 0), 0)
    ];
  }, [process, amount, primaryOutput, secondaryOutputsBonus]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    const onewayCrewTravelTime = crewTravelTime / 2;
    return [
      Math.max(onewayCrewTravelTime, inputTransportTime) + (setupTime + processingTime) / 8 + onewayCrewTravelTime,
      Math.max(onewayCrewTravelTime, inputTransportTime) + setupTime + processingTime + outputTransportTime
    ];
  }, [crewTravelTime, inputTransportTime, setupTime, processingTime, outputTransportTime]);

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel Time',
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
      label: 'Processing Time',
      value: formatTimer(setupTime + processingTime),
      direction: getBonusDirection(processingTimeBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={processingTimeBonus}
          title="Processing Time"
          totalTime={setupTime + processingTime}
          crewRequired="start" />
      )
    },
    {
      label: 'Transport Distance',
      value: `${formatFixed(inputTransportDistance + outputTransportDistance, 1)} km`,
      direction: 0
    },
    {
      label: 'Transport Time',
      value: formatTimer(inputTransportTime + outputTransportTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
          title="Transport Time"
          totalTime={inputTransportTime + outputTransportTime}
          crewRequired="start" />
      )
    },
    {
      label: 'Output Mass',
      value: formatMass(outputMass),
      direction: 0,
    },
    {
      label: 'Output Volume',
      value: formatVolume(outputVolume),
      direction: 0,
    },
  ]), [
    crewTravelBonus,
    crewTravelTime,
    inputTransportDistance,
    inputTransportTime,
    outputMass,
    outputVolume,
    outputTransportDistance,
    outputTransportTime,
    processingTime,
    processingTimeBonus,
    setupTime,
    tripDetails
  ]);

  const onFinishProcess = useCallback(() => {
    finishProcess();
  }, [finishProcess]);

  const onStartProcess = useCallback(() => {
    startProcess({
      processId,
      primaryOutputId: primaryOutput,
      recipeTally: amount,
      origin,
      originSlot: originInventory?.slot,
      destination,
      destinationSlot: destinationInventory?.slot
    });
  }, [
    amount, destination, destinationInventory, processId, origin, originInventory, primaryOutput
  ]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (processStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = processStatus;
  }, [processStatus]);

  const isOriginSufficient = useMemo(() => {
    if (!originInventory || !process) return false;
    const sourceContentObj = (originInventory?.contents || []).reduce((acc, cur) => ({ ...acc, [cur.product]: cur.amount }), {});
    return !inputArr.find((i) => (sourceContentObj[i] || 0) < process.inputs[i] * amount);
  }, [amount, inputArr, originInventory?.contents, process]);

  const [headerAction, gerund] = useMemo(() => {
    if (processor.processorType === Processor.IDS.REFINERY) {
      return [
        {
          icon: <RefineIcon />,
          label: 'Refine Materials',
        },
        'Refining'
      ];
    }
    if (processor.processorType === Processor.IDS.FACTORY) {
      return [
        {
          icon: <ManufactureIcon />,
          label: 'Manufacture Goods',
        },
        'Manufacturing'
      ];
    }
    if (processor.processorType === Processor.IDS.BIOREACTOR) {
      return [
        {
          icon: <GrowIcon />,
          label: 'Manufacture Organics',
        },
        'Manufacturing'
      ];
    }
    if (processor.processorType === Processor.IDS.SHIPYARD) {
      return [
        {
          icon: <AssembleIcon />,
          label: 'Manufacture Ship Parts',
        },
        'Manufacturing'
      ];
    }
    return [{}, ''];
  }, [processor.processorType]);

  return (
    <>
      <ActionDialogHeader
        action={headerAction}
        actionCrew={crew}
        location={{ asteroid, lot }}
        delayUntil={currentProcess?.startTime || crew?.Crew?.readyUntil}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage}
        wide />

      <ActionDialogBody>
        <FlexSection style={{ marginBottom: 32, width: SECTION_WIDTH }}>
          <LotInputBlock
            title={`${gerund} Location`}
            lot={lot}
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ flex: '0 0 30%' }}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock
            title="Process"
            titleDetails={!process ? undefined : (
              <span style={{ fontSize: '85%' }}>Setup Time: {formatTimer(setupTime)}</span>
            )}
            bodyStyle={{ padding: 0 }}
            style={{ alignSelf: 'flex-start', flex: 1 }}>

            <FlexSectionInputBody
              isSelected={stage === actionStages.NOT_STARTED}
              onClick={stage === actionStages.NOT_STARTED ? () => setProcessSelectorOpen(true) : undefined}
              style={{ padding: 4 }}>
              <SelectorInner>
                <IconWrapper>
                  <ProductionIcon />
                </IconWrapper>
                <label>{process?.name || `Select a Process...`}</label>
                {stage === actionStages.NOT_STARTED && (
                  <>
                    {process ? <IconButton borderless><CloseIcon /></IconButton> : <CaretIcon />}
                  </>
                )}
              </SelectorInner>
              <ClipCorner dimension={sectionBodyCornerSize} />
            </FlexSectionInputBody>

            <RecipeSlider
              disabled={!process || stage !== actionStages.NOT_STARTED}
              amount={amount}
              increment={recipeStepSize}
              processingTime={processingTime}
              min={0}
              max={maxAmount}
              setAmount={setAmount}
            />
          </FlexSectionBlock>
        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <InventoryInputBlock
            title="Input Inventory"
            titleDetails={<TransferDistanceDetails distance={inputTransportDistance} crewDistBonus={crewDistBonus} />}
            disabled={!process || stage !== actionStages.NOT_STARTED}
            entity={origin}
            inventorySlot={selectedOrigin?.slot}
            inventoryBonuses={crew?._inventoryBonuses}
            imageProps={{
              iconOverride: <InventoryIcon />,
            }}
            isSourcing
            isSelected={process && stage === actionStages.NOT_STARTED}
            onClick={() => { setOriginSelectorOpen(true) }}
            stage={stage}
            style={{ flex: '0 0 30%', marginBottom: 20 }}
            sublabel={
              originLot
                ? <><LocationIcon /> {formatters.lotName(originLotIndex)}</>
                : 'Inventory'
            }
            transferMass={inputMass}
            transferVolume={inputVolume} />

          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <ProcessInputOutputSection
            input
            title={
              process
                ? <>Required: <b style={{ color: 'white', marginLeft: 4 }}>{inputArr.length} Products</b></>
                : `Requirements`
            }
            products={
              process
                ? inputArr.map((i) => ({ i, recipe: process.inputs[i], amount: process.inputs[i] * amount }))
                : []
            }
            source={originInventory}
            stage={stage}
            style={{ alignSelf: 'flex-start', flex: 1 }} />

        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <InventoryInputBlock
            title="Output Inventory"
            titleDetails={<TransferDistanceDetails distance={outputTransportDistance} crewDistBonus={crewDistBonus} />}
            disabled={!process || stage !== actionStages.NOT_STARTED}
            entity={destination}
            inventorySlot={selectedDestination?.slot}
            inventoryBonuses={crew?._inventoryBonuses}
            imageProps={{
              iconOverride: <InventoryIcon />,
            }}
            isSelected={process && stage === actionStages.NOT_STARTED}
            onClick={() => { setDestinationSelectorOpen(true) }}
            stage={stage}
            style={{ flex: '0 0 30%', marginBottom: 20 }}
            sublabel={
              destinationLot
                ? <><LocationIcon /> {formatters.lotName(destinationLotIndex)}</>
                : 'Inventory'
            }
            transferMass={outputMass}
            transferVolume={outputVolume} />

          <FlexSectionSpacer>
            <BackIcon />
          </FlexSectionSpacer>

          <ProcessInputOutputSection
            disabled={stage !== actionStages.NOT_STARTED}
            secondaryOutputsBonus={secondaryOutputsBonus?.totalBonus}
            output
            title={
              process
                ? <>Produced: <b style={{ color: 'white', marginLeft: 4 }}>{outputArr.length} Products</b></>
                : `Production`
            }
            products={
              process
                ? outputArr.map((o) => ({ i: o.id, recipe: process.outputs[o.id], amount: o.amount }))
                : []
            }
            primaryOutput={primaryOutput}
            stage={stage}
            setPrimaryOutput={stage === actionStages.NOT_STARTED ? setPrimaryOutput : null}
            style={{ alignSelf: 'flex-start', flex: 1 }} />

        </FlexSection>

        {stage !== actionStages.NOT_STARTED && (
          <ProgressBarSection
            finishTime={currentProcess?.finishTime}
            startTime={currentProcess?.startTime}
            stage={stage}
            title="Progress"
            totalTime={taskTimeRequirement}
            width="100%"
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
          wide
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={
          stage === actionStages.NOT_STARTED
          && !(
            process
            && amount >= recipeStepSize
            && originInventory
            && isOriginSufficient
            && destinationInventory
            && crewCan(Permission.IDS.RUN_PROCESS, lot.building
            )
          )
        }
        goLabel="Begin"
        onGo={onStartProcess}
        finalizeLabel="Finish"
        isSequenceable
        onFinalize={onFinishProcess}
        stage={stage}
        waitForCrewReady
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <>
          <ProcessSelectionDialog
            initialSelection={processId}
            processorType={processor?.processorType}
            onClose={() => setProcessSelectorOpen(false)}
            onSelected={setProcessId}
            open={processSelectorOpen}
          />

          {/* dest can be site, but not source */}
          <InventorySelectionDialog
            asteroidId={asteroid?.id}
            excludeSites
            otherEntity={lot?.building}
            isSourcing
            itemIds={inputArr}
            onClose={() => setOriginSelectorOpen(false)}
            onSelected={setSelectedOrigin}
            open={originSelectorOpen}
            requirePresenceOfItemIds
          />

          <InventorySelectionDialog
            asteroidId={asteroid?.id}
            otherEntity={lot?.building}
            itemIds={outputArr.map(o => o.id)}
            onClose={() => setDestinationSelectorOpen(false)}
            onSelected={setSelectedDestination}
            open={destinationSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);

  const processManager = useProcessManager(lot?.id, props.processorSlot);
  const { actionStage } = processManager;

  useEffect(() => {
    if (props.onClose) {
      if (!asteroid || !lot) {
        if (!isLoading) {
          props.onClose();
        }
      } else if (!props.processorSlot) {
        props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={lot?.building?.Building?.buildingType && `Production_${lot?.building?.Building?.buildingType}`}
      isLoading={reactBool(isLoading)}
      stage={actionStage}
      extraWide>
      <ProcessIO
        asteroid={asteroid}
        lot={lot}
        processManager={processManager}
        processorSlot={props.processorSlot}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
