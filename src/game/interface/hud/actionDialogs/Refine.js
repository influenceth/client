import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { BackIcon, CaretIcon, CloseIcon, CoreSampleIcon, ExtractionIcon, ForwardIcon, HexagonIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ProcessIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  BuildingImage,
  ProgressBarSection,
  AsteroidImage,
  ProgressBarNote,
  PropellantSection,
  ShipTab,
  PropulsionTypeSection,
  FlexSectionBlock,
  FlexSectionInputBody,
  sectionBodyCornerSize,
  RecipeSlider,
  ProcessInputOutputSection,
  TransferDistanceDetails,
  ProcessSelectionDialog
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
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
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${sectionBodyCornerSize * 0.6}px),
    calc(100% - ${sectionBodyCornerSize * 0.6}px) 100%,
    0 100%
  );
  display: flex;
  font-size: 30px;
  height: 50px;
  justify-content: center;
  width: 50px;
`;
const RightIconWrapper = styled.div``;

const processes = [
  {
    i: 1,
    name: 'Water Electrolysis',
    inputs: [
      { resourceId: 9, recipe: 9 },
      { resourceId: 10, recipe: 1 },
    ],
    outputs: [
      { resourceId: 40, recipe: 1 },
      { resourceId: 11, recipe: 6 },
      { resourceId: 12, recipe: 6 },
    ],
  },
  {
    i: 2,
    name: 'Rare Earths Oxalation and Calcination',
    inputs: [
      { resourceId: 13, recipe: 9 },
      { resourceId: 14, recipe: 7 },
      { resourceId: 15, recipe: 4 },
      { resourceId: 16, recipe: 1 },
      { resourceId: 17, recipe: 1 },
    ],
    outputs: [
      { resourceId: 41, recipe: 2 },
      { resourceId: 18, recipe: 1 },
    ],
  },
];

const Refine = ({ asteroid, lot, manager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const ships = useShipAssets();
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewMemberMap } = useCrewContext();
  const { data: launchOriginLot } = useLot(asteroid?.i, currentLaunch?.originLotId);

  const [amount, setAmount] = useState(0);
  const [processId, setProcessId] = useState();
  const [processSelectorOpen, setProcessSelectorOpen] = useState(false);
  const [primaryOutput, setPrimaryOutput] = useState();

  const [propulsionType, setPropulsionType] = useState('propulsive');
  const [tab, setTab] = useState(0);
  
  const process = processId && processes.find((p) => p.i === processId);
  useEffect(() => {
    if (!process) return;
    setPrimaryOutput(process.outputs[0].resourceId);
    setAmount(1e3); // TODO: whatever max is
  }, [process]);

  const crewMembers = currentLaunch?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
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
          icon: <HexagonIcon />,
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
          <FlexSectionInputBlock
            title="Refining Location"
            image={<BuildingImage building={buildings[lot?.building?.capableType || 0]} />}
            label={`${buildings[lot?.building?.capableType || 0].name}`}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={`Lot #${lot?.i}`}
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

          <FlexSectionInputBlock
            title="Input Inventory"
            titleDetails={<TransferDistanceDetails distance={8} />}
            image={<BuildingImage building={buildings[lot?.building?.capableType || 0]} />}
            label={`${buildings[lot?.building?.capableType || 0].name}`}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={`Lot #${lot?.i}`}
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

          <FlexSectionInputBlock
            title="Output Inventory"
            titleDetails={<TransferDistanceDetails distance={19} />}
            image={<BuildingImage building={buildings[lot?.building?.capableType || 0]} />}
            label={`${buildings[lot?.building?.capableType || 0].name}`}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={`Lot #${lot?.i}`}
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
            completionTime={lot?.building?.construction?.completionTime}
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
          processes={processes}
          onClose={() => setProcessSelectorOpen(false)}
          onSelected={setProcessId}
          open={processSelectorOpen}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
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
      isLoading={isLoading}
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
