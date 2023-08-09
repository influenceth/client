import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Building, Crewmate, Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { BackIcon, CaretIcon, CloseIcon, CoreSampleIcon, ExtractionIcon, ForwardIcon, ConstructShipIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ProcessIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { boolAttr, formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

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
  ProcessInputSquareSection,
  ShipImage,
  formatMass,
  ProcessSelectionDialog,
  getBuildingInputDefaults
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';

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

const BuildShip = ({ asteroid, lot, manager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewmateMap } = useCrewContext();
  const { data: launchOriginLot } = useLot(asteroid?.i, currentLaunch?.originLotId);

  const [amount, setAmount] = useState(0);
  const [shipId, setShipId] = useState();
  const [processSelectorOpen, setProcessSelectorOpen] = useState(false);

  const [primaryOutput, setPrimaryOutput] = useState(40);
  const [propulsionType, setPropulsionType] = useState('propulsive');

  const processes = Object.keys(Ship.CONSTRUCTION_TYPES).map((i) => ({
    i,
    name: `${Ship.TYPES[i].name} Integration`,
    ...(Ship.CONSTRUCTION_TYPES[i]),
  }));

  const process = shipId && processes.find((p) => p.i === shipId);
  const ship = shipId && Ship.TYPES[shipId];

  const crewmates = currentLaunch?._crewmates || (crew?.crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = getCrewAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);
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
          icon: <ConstructShipIcon />,
          label: 'Construct Ship Components',
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
            {...getBuildingInputDefaults(lot)}
            title="Construction Location"
            disabled={stage !== actionStages.NOT_STARTED}
            style={{ width: 350 }}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock
            title="Process"
            titleDetails={<span style={{ fontSize: '85%' }}>Setup Time: 2h</span>}
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
              amount={amount}
              processingTime={10 * amount}
              min={0}
              max={1000}
              setAmount={setAmount}
            />
          </FlexSectionBlock>
        </FlexSection>

        <FlexSection style={{ width: SECTION_WIDTH }}>

          <div style={{ width: 350 }}>

            <FlexSectionInputBlock
              title="Input Inventory"
              titleDetails={<TransferDistanceDetails distance={8} />}
              {...getBuildingInputDefaults(lot)}
              disabled={stage !== actionStages.NOT_STARTED}
              style={{ marginBottom: 20, width: '100%' }}
            />

            <FlexSectionInputBlock
              title="Output Inventory"
              titleDetails={<TransferDistanceDetails distance={19} />}
              {...getBuildingInputDefaults(lot)}
              disabled={stage !== actionStages.NOT_STARTED}
              style={{ width: '100%' }}
            />
          </div>
          
          <FlexSectionSpacer style={{ alignItems: 'flex-start', paddingTop: '54px' }}>
            <ForwardIcon />
          </FlexSectionSpacer>

          <div style={{ alignSelf: 'flex-start', width: '280px' }}>
            <ProcessInputSquareSection
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
              style={{ width: '100%' }} />
          </div>
          
          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', width: '280px' }}>
            <FlexSectionBlock
              title={ship ? <>Produced: <b style={{ color: 'white', marginLeft: 4 }}>1 Ship</b></> : `Production`}
              bodyStyle={{ display: 'flex', justifyContent: 'center', padding: 0 }}
              style={{ width: '100%' }}>
                {ship && (
                  <ResourceThumbnail
                    backgroundColor={`rgba(${hexToRGB(theme.colors.green)}, 0.15)`}
                    badge={`+${formatMass(9e8 * shipId)}`}
                    badgeColor={theme.colors.green}
                    contain
                    resource={ship}
                    size="270px"
                    tooltipContainer="actionDialog" />
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
        disabled={false/* TODO: insufficient propellant + anything else? */}
        goLabel="Launch"
        onGo={onLaunch}
        stage={stage}
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <ProcessSelectionDialog
          initialSelection={shipId}
          processes={processes}
          onClose={() => setProcessSelectorOpen(false)}
          onSelected={setShipId}
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
      isLoading={boolAttr(isLoading)}
      stage={actionStage}
      extraWide>
      <BuildShip
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
