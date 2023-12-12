import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Crewmate, Lot, Process, Processor, Product, Time } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { BackIcon, CaretIcon, CloseIcon, ForwardIcon, RefineIcon, ProcessIcon, BioreactorBuildingIcon, ShipyardBuildingIcon, InventoryIcon, LocationIcon, RefineryBuildingIcon, ManufactureIcon } from '~/components/Icons';
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
  ShipImage,
  ProcessInputOutputSection,
  formatVolume,
  ProgressBarSection
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';
import useProcessManager from '~/hooks/actionManagers/useProcessManager';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';

const SECTION_WIDTH = 1150;

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

const noop = () => {};

const ProcessIO = ({ asteroid, lot, processorSlot, processManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentProcess, processStatus, startProcess, finishProcess } = processManager;
  const processor = useMemo(
    () => (lot.building?.Processors || []).find((e) => e.slot === processorSlot) || {},
    [lot.building, processorSlot]
  );

  const { crew } = useCrewContext();

  const [selectedOrigin, setSelectedOrigin] = useState(currentProcess ? { ...currentProcess?.origin, slot: currentProcess?.originSlot } : undefined);
  const { data: origin } = useEntity(selectedOrigin);
  const originLotId = useMemo(() => origin && locationsArrToObj(origin?.Location?.locations || []).lotId, [origin]);
  const { data: originLot } = useLot(originLotId);
  const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => i.slot === selectedOrigin?.slot), [origin, selectedOrigin?.slot]);

  const [selectedDestination, setSelectedDestination] = useState(currentProcess ? { ...currentProcess?.destination, slot: currentProcess?.destinationSlot } : undefined);
  const { data: destination } = useEntity(selectedDestination);
  const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  const { data: destinationLot } = useLot(destinationLotId);
  const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === selectedDestination?.slot), [destination, selectedDestination?.slot]);

  const [amount, setAmount] = useState(currentProcess?.recipeTally || 1);
  const [processId, setProcessId] = useState(currentProcess?.processId);
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [processSelectorOpen, setProcessSelectorOpen] = useState(false);
  const [primaryOutput, setPrimaryOutput] = useState(currentProcess?.primaryOutputId);
  
  const process = Process.TYPES[processId];
  const maxAmount = useMemo(() => {
    if (!process) return 1;
    const maxSafeAmount = 1000;// Number.MAX_SAFE_INTEGER / 2 ** 32; // technical max value
    return Math.min(maxSafeAmount, Math.floor((365 * 86400) / process.recipeTime));
  }, [process]);

  useEffect(() => {
    if (!process) return;
    if (currentProcess) return;
    setPrimaryOutput(Number(Object.keys(process.outputs)[0]));
    setAmount(maxAmount);
  }, [currentProcess, maxAmount, process]);

  const crewmates = currentProcess?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];

  const [crewTravelBonus, processingTimeBonus] = useMemo(() => {
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME];
    if (processor.processorType === Processor.IDS.BIOREACTOR) {
      bonusIds.push(Crewmate.ABILITY_IDS.REACTION_TIME);
    } else if (processor.processorType === Processor.IDS.REFINERY) {
      bonusIds.push(Crewmate.ABILITY_IDS.REFINING_TIME);
    } else {
      bonusIds.push(Crewmate.ABILITY_IDS.MANUFACTURING_TIME);
    }
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
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Processor', lotIndex: Lot.toIndex(lot.id) },
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

  const [inputArr, inputMass, inputVolume, outputArr, outputMass, outputVolume] = useMemo(() => {
    if (!process || !amount) return [[], 0, 0, [], 0, 0];
    const inputArr = Object.keys(process.inputs || {}).map(Number);
    const outputArr = Object.keys(process.outputs || {}).map(Number);
    return [
      inputArr,
      inputArr.reduce((sum, i) => sum + process.inputs[i] * amount * (Product.TYPES[i].massPerUnit || 0), 0),
      inputArr.reduce((sum, i) => sum + process.inputs[i] * amount * (Product.TYPES[i].volumePerUnit || 0), 0),
      outputArr,
      outputArr.reduce((sum, i) => sum + process.outputs[i] * amount * (Product.TYPES[i].massPerUnit || 0), 0),
      outputArr.reduce((sum, i) => sum + process.outputs[i] * amount * (Product.TYPES[i].volumePerUnit || 0), 0),
    ];
  }, [process, amount, primaryOutput]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [
      crewTravelTime + setupTime,
      Math.max(crewTravelTime / 2, inputTransportTime) + setupTime + processingTime + outputTransportTime
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
          label: 'Manufacture Products',
        },
        'Manufacturing'
      ];
    }
    if (processor.processorType === Processor.IDS.BIOREACTOR) {
      return [
        {
          icon: <BioreactorBuildingIcon />,
          label: 'Manufacture Organics',
        },
        'Manufacturing'
      ];
    }
    if (processor.processorType === Processor.IDS.SHIPYARD) {
      return [
        {
          icon: <ShipyardBuildingIcon />,
          label: 'Manufacture Ship Parts',
        },
        'Manufacturing'
      ];
    }
    return [{}, ''];
  }, [processor.processorType]);

  const recipeStepSize = useMemo(() => {
    if (process) {
      return Object.keys(process.outputs).reduce((acc, i) => {
        const outputStep = Product.TYPES[i].isAtomic
          ? Math.floor(1000 / process.outputs[i]) / 1000
          : 0.001;
        return Math.max(acc, outputStep);
      }, 0.001);
    }
    return 0.001;
  }, [process]);

  return (
    <>
      <ActionDialogHeader
        action={headerAction}
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
            title={`${gerund} Location`}
            lot={lot}
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ width: '33.3%' }}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock
            title="Process"
            titleDetails={!process ? undefined : (
              <span style={{ fontSize: '85%' }}>Setup Time: {formatTimer(setupTime)}</span>
            )}
            bodyStyle={{ padding: 0 }}
            style={{ alignSelf: 'flex-start', width: '66.7%' }}>

            <FlexSectionInputBody
              isSelected={stage === actionStages.NOT_STARTED}
              onClick={stage === actionStages.NOT_STARTED ? () => setProcessSelectorOpen(true) : undefined}
              style={{ padding: 4 }}>
              <SelectorInner>
                <IconWrapper>
                  <ProcessIcon />
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
            titleDetails={<TransferDistanceDetails distance={inputTransportDistance} crewTravelBonus={crewTravelBonus} />}
            disabled={!process || stage !== actionStages.NOT_STARTED}
            entity={origin}
            inventorySlot={selectedOrigin?.slot}
            imageProps={{
              iconOverride: <InventoryIcon />,
            }}
            isSelected={process && stage === actionStages.NOT_STARTED}
            onClick={() => { setOriginSelectorOpen(true) }}
            style={{ marginBottom: 20, width: '33.3%' }}
            sublabel={
              originLot
              ? <><LocationIcon /> {formatters.lotName(selectedOrigin?.lotIndex)}</>
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
            style={{ alignSelf: 'flex-start', width: '66.7%' }} />

        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <InventoryInputBlock
            title="Output Inventory"
            titleDetails={<TransferDistanceDetails distance={outputTransportDistance} crewTravelBonus={crewTravelBonus} />}
            disabled={!process || stage !== actionStages.NOT_STARTED}
            entity={destination}
            inventorySlot={selectedDestination?.slot}
            imageProps={{
              iconOverride: <InventoryIcon />,
            }}
            isSelected={process && stage === actionStages.NOT_STARTED}
            onClick={() => { setDestinationSelectorOpen(true) }}
            style={{ marginBottom: 20, width: '33.3%' }}
            sublabel={
              destinationLot
              ? <><LocationIcon /> {formatters.lotName(selectedDestination?.lotIndex)}</>
              : 'Inventory'
            }
            transferMass={outputMass}
            transferVolume={outputVolume} />

          <FlexSectionSpacer>
            <BackIcon />
          </FlexSectionSpacer>

          <ProcessInputOutputSection
            disabled={stage !== actionStages.NOT_STARTED}
            output
            title={
              process
                ? <>Produced: <b style={{ color: 'white', marginLeft: 4 }}>{outputArr.length} Products</b></>
                : `Production`
            }
            products={
              process
                ? outputArr.map((i) => ({ i, recipe: process.outputs[i], amount: process.outputs[i] * amount }))
                : []
            }
            primaryOutput={primaryOutput}
            setPrimaryOutput={stage === actionStages.NOT_STARTED ? setPrimaryOutput : null}
            style={{ alignSelf: 'flex-start', width: '66.7%' }} />

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
        disabled={!(process && amount > 0 && originInventory && isOriginSufficient && destinationInventory)}
        goLabel="Begin"
        onGo={onStartProcess}
        finalizeLabel="Finish"
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

          <InventorySelectionDialog
            otherEntity={lot.building}
            otherLotId={lot?.id}
            itemIds={outputArr}
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
      actionImage={travelBackground}
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
