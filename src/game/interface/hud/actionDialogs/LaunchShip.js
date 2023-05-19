import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ExtractionAmountSection,
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
  MiniBarChartSection
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';

const CrewCards = styled.div`
  display: flex;
  flex-direction: row;
  & > div {
    margin-right: 5px;
    &:last-child {
      margin-right: 0;
    }
  }
`;
const CrewCardPlaceholder = styled.div`
  width: 60px;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.07);
    display: block;
    height: 0;
    padding-top: 128%;
  }
`;


// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

const LaunchShip = ({ asteroid, lot, manager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const ships = useShipAssets();
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewMemberMap } = useCrewContext();
  const { data: launchOriginLot } = useLot(asteroid?.i, currentLaunch?.originLotId);

  const [tab, setTab] = useState(0);
  const ship = ships[0];  // TODO

  const crewMembers = currentLaunch?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;/*useMemo(() => {
    const bonus = getCrewAbilityBonus(4, crewMembers);
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
  }, [asteroid?.bonuses, crewMembers, selectedCoreSample?.resourceId]);*/

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
      label: 'Launch Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Delta V Used',
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

  useEffect(() => {
    console.log('set tin');
    const x = setInterval(() => console.log('still open'), 1000);
    return () => {
      console.log('clear tin');
      if (x) clearInterval(x);
    }
  }, []);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <LaunchShipIcon />,
          label: 'Launch Ship',
        }}
        captain={captain}
        crewAvailableTime={0}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Launch' },
            { icon: <ShipIcon />, label: 'Ship' },
          ]}
        />

        {tab === 0 && (
          <>
            <FlexSection>
              <FlexSectionInputBlock
                title="Origin"
                image={<BuildingImage building={buildings[lot?.building?.capableType || 0]} />}
                label={`${buildings[lot?.building?.capableType || 0].name}`}
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={`Lot #${lot?.i}`}
              />

              <FlexSectionSpacer />

              <FlexSectionInputBlock
                title="Destination"
                image={<AsteroidImage asteroid={asteroid} />}
                label={asteroid?.customName || asteroid?.baseName || `Asteroid #${asteroid.i}`}
                sublabel="Orbit"
              />
            </FlexSection>

            <PropellantSection
              title="Propellant"
              propellantRequired={168e3}
              propellantLoaded={840e3}
              propellantMax={950e3}
            />

            {stage === actionStages.NOT_STARTED && (
              <>
                <ProgressBarSection
                  overrides={{
                    barColor: theme.colors.lightOrange,
                    color: theme.colors.lightOrange,
                    left: <><WarningOutlineIcon /> Launch Delay</>,
                    right: formatTimer(2700)
                  }}
                  stage={stage}
                  title="Port Traffic"
                />
                <ProgressBarNote themeColor="lightOrange">
                  <b>6 ships</b> are queued to launch ahead of you.
                </ProgressBarNote>
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <FlexSection>
              <FlexSectionInputBlock
                title="Ship"
                image={<ShipImage ship={ships[0]} />}
                label="Icarus"
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={ships[0].name}
              />

              <FlexSectionSpacer />

              <FlexSectionInputBlock
                title="Piloted By"
                titleDetails={crew?.name || `Crew #${crew?.i}`}
                bodyStyle={{ paddingRight: 8 }}>
                <CrewCards>
                  {Array.from({ length: 5 }).map((_, i) => 
                    crewMembers[i]
                      ? (
                        <CrewCardFramed
                          key={i}
                          borderColor={`rgba(${theme.colors.mainRGB}, 0.7)`}
                          crewmate={crewMembers[i]}
                          isCaptain={i === 0}
                          lessPadding
                          noArrow={i > 0}
                          width={60} />
                      )
                      : <CrewCardPlaceholder key={i} />
                  )}
                </CrewCards>
              </FlexSectionInputBlock>
            </FlexSection>

            <FlexSection>
              <div style={{ width: '50%'}}>
                <MiniBarChartSection>
                  <MiniBarChart
                    color="#8cc63f"
                    label="Propellant Mass"
                    valueLabel={`${formatFixed(0.5 * ship.maxPropellantMass / 1e3)} / ${formatFixed(ship.maxPropellantMass / 1e3)}t`}
                    value={0.5}
                  />
                  <MiniBarChart
                    color="#557826"
                    label="Propellant Volume"
                    valueLabel={`${formatFixed(0.5 * ship.maxPropellantMass / 1e3)} / ${formatFixed(ship.maxPropellantMass / 1e3)}m³`}
                    value={0.7}
                  />
                  <MiniBarChart
                    label="Cargo Mass"
                    valueLabel={`${formatFixed(0.5 * ship.maxCargoMass / 1e3)} / ${formatFixed(ship.maxCargoMass / 1e3)}t`}
                    value={0.8}
                  />
                  <MiniBarChart
                    color="#1f5f75"
                    label="Cargo Volume"
                    valueLabel={`${formatFixed(0.5 * ship.maxCargoMass / 1e3)} / ${formatFixed(ship.maxCargoMass / 1e3)}m³`}
                    value={0.3}
                  />
                  <MiniBarChart
                    color="#92278f"
                    label="Passengers"
                    valueLabel={`${crewMembers.length} / 5`}
                    value={crewMembers.length / 5}
                  />
                </MiniBarChartSection>
              </div>
            </FlexSection>
          </>
        )}



{/* 
        {stage === actionStages.NOT_STARTED && (
          <Section>
            <SectionTitle>Extraction Amount</SectionTitle>
            <SectionBody style={{ paddingTop: 5 }}>
              <ExtractionAmountSection
                amount={amount || 0}
                extractionTime={extractionTime || 0}
                min={0}
                max={selectedCoreSample?.remainingYield || 0}
                resource={resource}
                setAmount={setAmount} />
            </SectionBody>
          </Section>
        )}

        {stage !== actionStages.NOT_STARTED && (
          <ProgressBarSection
            completionTime={lot?.building?.extraction?.completionTime}
            startTime={lot?.building?.extraction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + extractionTime}
          />
        )}
*/}
        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: insufficient propellant + anything else? */}
        goLabel="Launch"
        onGo={onLaunch}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  console.log('PROPS', props);
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
      asteroid={asteroid}
      isLoading={isLoading}
      lot={lot}
      onClose={props.onClose}
      stage={actionStage}>
      <LaunchShip
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
