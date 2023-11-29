import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Crew, Crewmate, Process } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { BackIcon, CaretIcon, CloseIcon, ForwardIcon, RefineIcon, ProcessIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { reactBool, formatTimer } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  FlexSectionBlock,
  FlexSectionInputBody,
  sectionBodyCornerSize,
  RecipeSlider,
  ProcessInputOutputSection,
  TransferDistanceDetails,
  ProcessSelectionDialog,
  LotInputBlock,
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';

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

const Refine = ({ asteroid, lot, manager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewmateMap } = useCrewContext();
  const { data: launchOriginLot } = useLot(currentLaunch?.originLotId);

  const [amount, setAmount] = useState(0);
  const [processId, setProcessId] = useState();
  const [processSelectorOpen, setProcessSelectorOpen] = useState(false);
  const [primaryOutput, setPrimaryOutput] = useState();

  const [tab, setTab] = useState(0);
  
  const process = Process.TYPES[processId];
  useEffect(() => {
    if (!process) return;
    setPrimaryOutput(Object.keys(process.outputs)[0]);
    setAmount(1e3); // TODO: whatever max is
  }, [process]);

  const crewmates = currentLaunch?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crewmates);
  const launchBonus = 0;

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Task Duration',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Transfer Distance',
      value: `${Math.round(12)} km`,
      direction: 0
    },
    {
      label: 'Total Process Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Output Mass',
      value: `10,000 t`,
      direction: 0,
    },
    {
      label: 'Output Volume',
      value: <>1,000 m<sup>3</sup></>,
      direction: 0,
    },
  ]), []);

  const onLaunch = useCallback(() => {
    startLaunch();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (launchStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = launchStatus;
  }, [launchStatus]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <RefineIcon />,
          label: 'Refine Materials',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={0}
        taskCompleteTime={0}
        onClose={props.onClose}
        stage={stage}
        wide />

      <ActionDialogBody>
        <FlexSection style={{ marginBottom: 32, width: SECTION_WIDTH }}>
          <LotInputBlock
            title="Refining Location"
            lot={lot}
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ width: '33.3%' }}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock
            title="Process"
            titleDetails={<span style={{ fontSize: '85%' }}>Setup Time: 2h</span>}
            bodyStyle={{ padding: 0 }}
            style={{ alignSelf: 'flex-start', width: '66.7%' }}>

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
              amount={amount}
              processingTime={10 * amount}
              min={0}
              max={1000}
              setAmount={setAmount}
            />
          </FlexSectionBlock>
        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <LotInputBlock
            title="Input Inventory"
            titleDetails={<TransferDistanceDetails distance={8} />}
            lot={lot}
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ width: '33.3%' }}
          />

          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <ProcessInputOutputSection
            input
            title={
              process
                ? <>Required: <b style={{ color: 'white', marginLeft: 4 }}>{process.inputs.length} Products</b></>
                : `Requirements`
            }
            products={
              process
                ? process.inputs.map((p) => ({ ...p, amount: p.recipe * 6500 }))
                : []
            }
            style={{ alignSelf: 'flex-start', width: '66.7%' }} />

        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <LotInputBlock
            title="Output Inventory"
            titleDetails={<TransferDistanceDetails distance={19} />}
            lot={lot}
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ width: '33.3%' }}
          />

          <FlexSectionSpacer>
            <BackIcon />
          </FlexSectionSpacer>

          <ProcessInputOutputSection
            output
            title={
              process
                ? <>Produced: <b style={{ color: 'white', marginLeft: 4 }}>{process.outputs.length} Products</b></>
                : `Production`
            }
            products={
              process
                ? process.outputs.map((p) => ({ ...p, amount: p.recipe * 6500 }))
                : []
            }
            primaryOutput={primaryOutput}
            setPrimaryOutput={setPrimaryOutput}
            style={{ alignSelf: 'flex-start', width: '66.7%' }} />

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
        disabled={false/* TODO: insufficient propellant + anything else? */}
        goLabel="Launch"
        onGo={onLaunch}
        stage={stage}
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <ProcessSelectionDialog
          initialSelection={processId}
          processorType={lot?.building?.Processors?.[0]?.processorType}
          onClose={() => setProcessSelectorOpen(false)}
          onSelected={setProcessId}
          open={processSelectorOpen}
        />
      )}
      
      {/* TODO: ecs refactor -- now that shipyard has two processors, need somewhere to construct ships
      {stage === actionStages.NOT_STARTED && (
        <ShipConstructionSelectionDialog
          initialSelection={processId}
          onClose={() => setProcessSelectorOpen(false)}
          onSelected={setProcessId}
          open={processSelectorOpen}
        />
      )}
      */}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  // TODO: ...
  // const extractionManager = useExtractionManager(lot?.id);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

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
      <Refine
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
