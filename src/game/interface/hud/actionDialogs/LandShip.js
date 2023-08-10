import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Building, Crew, Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LandShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { boolAttr, formatFixed, formatTimer } from '~/lib/utils';

import {
  ResourceAmountSlider,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  getBonusDirection,
  formatResourceVolume,
  formatSampleMass,
  formatSampleVolume,
  TravelBonusTooltip,
  TimeBonusTooltip,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  EmptyResourceImage,
  FlexSectionSpacer,
  BuildingImage,
  EmptyBuildingImage,
  Section,
  SectionTitle,
  SectionBody,
  ProgressBarSection,
  CoreSampleSelectionDialog,
  DestinationSelectionDialog,
  SublabelBanner,
  AsteroidImage,
  ProgressBarNote,
  GenericSection,
  BarChart,
  PropellantSection,
  ShipImage,
  formatMass,
  MiniBarChart,
  MiniBarChartSection,
  ShipTab,
  LandingSelectionDialog,
  PropulsionTypeSection,
  getBuildingInputDefaults
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import formatters from '~/lib/formatters';

// TODO: ecs refactor

const LandShip = ({ asteroid, lot, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentLanding, landingStatus, startLanding } = manager;

  const [destinationLot, setDestinationLot] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState();
  
  const { crew, crewmateMap } = useCrewContext();
  const { data: landingDestinationLot } = useLot(asteroid?.i, currentLanding?.destinationLotId);
  
  const [propulsionType, setPropulsionType] = useState('propulsive');
  const [tab, setTab] = useState(0);

  const crewmates = currentLanding?._crewmates || (crew?.crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);
  const landingBonus = 0;/*useMemo(() => {
    const bonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.EXTRACTION_RATE, crewmates);
    const asteroidBonus = Asteroid.getBonusByResource(asteroid?.bonuses, selectedCoreSample?.resourceId);
    if (asteroidBonus.totalBonus !== 1) {
      bonus.totalBonus *= asteroidBonus.totalBonus;
      bonus.others = [{
        text: `${resources[selectedCoreSample?.resourceId].category} Yield Bonus`,
        bonus: asteroidBonus.totalBonus - 1,
        direction: 1
      }];
    }
    return bonus;
  }, [asteroid?.bonuses, crewmates, selectedCoreSample?.resourceId]);*/

  // useEffect(() => {
  //   let defaultSelection;
  //   if (!currentExtraction && !selectedCoreSample) {
  //     if (props.preselect) {
  //       defaultSelection = usableSamples.find((s) => s.resourceId === props.preselect.resourceId && s.sampleId === props.preselect.sampleId);
  //     } else if (usableSamples.length === 1) {
  //       defaultSelection = usableSamples[0];
  //     }
  //     if (defaultSelection) {
  //       selectCoreSample(defaultSelection);
  //     }
  //   }
  // }, [!currentExtraction, !selectedCoreSample, usableSamples]);

  // // handle "currentExtraction" state
  // useEffect(() => {
  //   if (currentExtraction) {
  //     if (lot?.coreSamples) {
  //       const currentSample = lot.coreSamples.find((c) => c.resourceId === currentExtraction.resourceId && c.sampleId === currentExtraction.sampleId);
  //       if (currentSample) {
  //         setSelectedCoreSample({
  //           ...currentSample,
  //           remainingYield: currentSample.remainingYield + (currentExtraction.isCoreSampleUpdated ? currentExtraction.yield : 0)
  //         });
  //         setAmount(currentExtraction.yield);
  //       }
  //     }
  //   }
  // }, [currentExtraction, lot?.coreSamples]);

  // useEffect(() => {
  //   if (currentExtractionDestinationLot) {
  //     setDestinationLot(currentExtractionDestinationLot);
  //   }
  // }, [currentExtractionDestinationLot]);

  // const resource = useMemo(() => {
  //   if (!selectedCoreSample) return null;
  //   return resources[selectedCoreSample.resourceId];
  // }, [selectedCoreSample]);

  // const extractionTime = useMemo(() => {
  //   if (!selectedCoreSample) return 0;
  //   return Extraction.getExtractionTime(
  //     amount,
  //     selectedCoreSample.remainingYield || 0,
  //     extractionBonus.totalBonus || 1
  //   );
  // }, [amount, extractionBonus, selectedCoreSample]);


  // const crewTravelTime = 0;
  // const tripDetails = null;


  const stats = useMemo(() => ([
    {
      label: 'Propellant Used',
      value: `0 tonnes`,
      direction: 0
    },
    {
      label: 'Arriving In',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Delta-V Used',
      value: `1.712 m/s`,
      direction: 0,
    },
    {
      label: 'Max Acceleration',
      value: <>1.712 m/s<sup>2</sup></>,
      direction: 0,
    },
    {
      label: 'Wet Mass',
      value: `10,000 t`,
      direction: 0,
    },
    {
      label: 'Cargo Mass',
      value: `1,000 t`,
      direction: 0,
    },
    {
      label: 'Cargo Volume',
      value: <>1,000 m<sup>3</sup></>,
      direction: 0,
    },
    {
      label: 'Passengers',
      value: `5`,
      direction: 0,
    },
  ]), []);

  const onLand = useCallback(() => {
    startLanding();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (landingStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = landingStatus;
  }, [landingStatus]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <LandShipIcon />,
          label: 'Land Ship',
          status: stage === actionStages.NOT_STARTED ? 'On Surface' : undefined,
        }}
        captain={captain}
        location={{ asteroid, lot, ship }}
        crewAvailableTime={0}
        taskCompleteTime={0}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.main : undefined}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Land' },
            { icon: <ShipIcon />, label: 'Ship' },
          ]}
        />

        {tab === 0 && (
          <>
            <FlexSection>
              <FlexSectionInputBlock
                title="Origin"
                image={<AsteroidImage asteroid={asteroid} />}
                label={formatters.asteroidName(asteroid)}
                sublabel="Orbit"
              />

              <FlexSectionSpacer />
              
              <FlexSectionInputBlock
                title="Destination"
                {...getBuildingInputDefaults(lot)}
                disabled={stage !== actionStages.NOT_STARTED}
                onClick={() => setDestinationSelectorOpen(true)}
                isSelected={stage === actionStages.NOT_STARTED}
              />
            </FlexSection>

            <FlexSection style={{ marginBottom: -15 }}>
              <PropulsionTypeSection
                objectLabel="Landing"
                onSelect={(x) => () => setPropulsionType(x)}
                selected={propulsionType} />

              <FlexSectionSpacer />

              <PropellantSection
                title="Propellant"
                deltaVLoaded={1500}
                deltaVRequired={propulsionType === 'tug' ? 0 : 1123}
                propellantLoaded={840e3}
                propellantRequired={propulsionType === 'tug' ? 0 : 168e3}
                narrow
              />
            </FlexSection>

            {/* TODO: only need "port traffic" bar if landing in spaceport AND there is > 0 traffic (see also: launching) */}
            {stage === actionStages.NOT_STARTED && (
              <>
                <ProgressBarSection
                  overrides={{
                    barColor: theme.colors.lightOrange,
                    color: theme.colors.lightOrange,
                    left: <><WarningOutlineIcon /> Landing Delay</>,
                    right: formatTimer(2700)
                  }}
                  stage={stage}
                  title="Port Traffic"
                />
                <ProgressBarNote themeColor="lightOrange">
                  <b>6 ships</b> are queued to land ahead of you.
                </ProgressBarNote>
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <ShipTab
            pilotCrew={{ ...crew, roster: crewmates }}
            previousStats={{ propellantMass: -168e3 }}
            ship={ship}
            stage={stage} />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: insufficient propellant + anything else? */}
        goLabel="Land"
        onGo={onLand}
        stage={stage}
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <LandingSelectionDialog
          asteroid={asteroid}
          initialSelection={undefined/* TODO: default to self... */}
          onClose={() => setDestinationSelectorOpen(false)}
          onSelected={setDestinationLot}
          open={destinationSelectorOpen}
          ship={ship}
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
      stage={actionStage}>
      <LandShip
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
