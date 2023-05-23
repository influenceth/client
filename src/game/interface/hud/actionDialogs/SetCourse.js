import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, RotatedShipMarkerIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus, orbitTimeToGameTime } from '~/lib/utils';

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
  MiniBarChartSection,
  ShipTab
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import useAsteroid from '~/hooks/useAsteroid';
import ClockContext from '~/contexts/ClockContext';

const Banner = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, 0.5);
  color: white;
  display: flex;
  flex-direction: row;
  margin-bottom: 16px;

  & label {
    font-size: 18px;
    font-weight: bold;
    padding: 6px 12px;
    width: calc(50% - 20px);
    &:last-child {
      text-align: right;
    }
  }

  & span {
    font-size: 80%;
    text-align: center;
    text-transform: uppercase;
    width: 40px;
  }
`;
const CourseRow = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-bottom: 20px;
`;
const Course = styled.div`
  display: flex-inline;
  flex-direction: column;
  margin: 0 10px;
  width: 100%;
`;
const CourseLabels = styled.div`
  align-items: center;
  color: #aaa;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  & b {
    color: ${p => p.theme.colors.brightMain};
    text-transform: uppercase;
  }
`;
const CourseGraphic = styled(CourseLabels)`
  color: white;
  & label {
    align-items: center;
    display: flex;
    font-size: 26px;
    margin: 9px 15px;
    & span {
      display: inline-block;
      line-height: 1em;
      margin-left: 8px;
    }
  }
`;
const Dashes = styled.div`
  flex: 1;
  height: 2px;
  background-image: repeating-linear-gradient(to right, ${p => p.theme.colors.brightMain} 0%, ${p => p.theme.colors.brightMain} 70%, transparent 70%, transparent 100%);
  background-position: left top;
  background-repeat: repeat-x;
  background-size: 20px 2px;
  ${p => p.flip && `transform: scaleX(-1);`}
`;
const CourseDeltaV = styled(CourseLabels)`
  font-size: 90%;
  justify-content: center;
  & b {
    color: white;
    text-transform: none;
  }
`;
const InOrbit = styled.span`
  color: ${p => p.theme.colors.main};
  display: inline-block;
  margin-top: 4px;
  text-transform: uppercase;
`;

const TimingDetails = styled.div`
  align-self: flex-start;
  width: 50%;
  & > div {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
    color: white;
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
    padding: 4px 8px;
    & > label {
      flex: 1;
      opacity: 0.5;
    }
    & > span {
      font-size: 18px;
      font-weight: bold;
      & b {
        align-items: center;
        color: ${p => p.theme.colors.main};
        display: flex;
        & svg {
          margin-right: 6px;
        }
      }
    }
  }
`;

const DiamondOuter = styled.div`
  background: ${p => p.theme.colors.brightMain};
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  height: 2em;
  width: 2em;
`;
const DiamondInner = styled(DiamondOuter)`
  align-items: center;
  background: black;
  clip-path: polygon(
    50% 1px,
    calc(100% - 1px) 50%,
    50% calc(100% - 1px),
    1px 50%
  );
  display: flex;
  justify-content: center;
  padding-top: 2px;
`;

const LocationDiamond = () => (
  <DiamondOuter>
    <DiamondInner>
      <LocationIcon />
    </DiamondInner>
  </DiamondOuter>
);


// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

const SetCourse = ({ origin, destination, manager, stage, travelSolution, ...props }) => {
  const { coarseTime } = useContext(ClockContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const ships = useShipAssets();
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewMemberMap } = useCrewContext();

  const [tab, setTab] = useState(0);
  const ship = ships[0];  // TODO

  const crewMembers = currentLaunch?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

  const arrivingIn = useMemo(() => 3600 * (travelSolution.arrivalTime - coarseTime), [coarseTime, travelSolution])

  const stats = useMemo(() => ([
    {
      label: 'Propellant Used',
      value: `0 tonnes`,
      direction: 0
    },
    {
      label: 'Arriving In',
      value: formatTimer(arrivingIn, 3),
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

  const onLaunch = useCallback(() => {
    startLaunch();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (launchStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = launchStatus;
  }, [launchStatus]);

  const delay = travelSolution.departureTime - coarseTime;

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <SetCourseIcon />,
          label: 'Set Course',
        }}
        captain={captain}
        crewAvailableTime={arrivingIn}
        taskCompleteTime={arrivingIn}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Route' },
            { icon: <ShipIcon />, label: 'Ship' },
          ]}
        />

        {tab === 0 && (
          <>
            <Section>
              <Banner>
                <label>{origin.customName || origin.baseName || `Asteroid #${origin.i}`}</label>
                <span>to</span>
                <label>{destination.customName || destination.baseName || `Asteroid #${destination.i}`}</label>
              </Banner>
              <CourseRow>
                <AsteroidImage asteroid={origin} />
                <Course>
                  <CourseLabels>
                    <div>Orbit</div>
                    <b>Flight Time</b>
                    <div>Orbit</div>
                  </CourseLabels>
                  <CourseGraphic>
                    <LocationDiamond />
                    <Dashes />
                    <label>
                      <RotatedShipMarkerIcon />
                      <span>
                        {travelSolution.arrivalTime - travelSolution.departureTime} hours
                      </span>
                    </label>
                    <Dashes flip />
                    <LocationDiamond />
                  </CourseGraphic>
                  <CourseDeltaV>
                    <span>Trip Delta-V: <b>{Math.round(travelSolution.deltaV).toLocaleString()} m/s</b></span>
                  </CourseDeltaV>
                </Course>
                <AsteroidImage asteroid={destination} />
              </CourseRow>
            </Section>

            <PropellantSection
              title="Requirements"
              propellantRequired={168e3}
              propellantLoaded={840e3}
              propellantMax={950e3}
            />

            <FlexSection style={{ marginTop: 35 }}>
              <FlexSectionInputBlock
                image={<ShipImage ship={ship} />}
                label="Icarus"
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={(
                  <>
                    <div>{ship.name}</div>
                    <InOrbit>In Orbit</InOrbit>
                  </>
                )}
              />

              <FlexSectionSpacer />

              <TimingDetails>
                <div>
                  <label>Departure Delay</label>
                  <span>
                    {delay > 0.1
                      ? <b><WarningOutlineIcon /> {formatTimer(3600 * delay, 2)}</b>
                      : <>{formatTimer(3600 * delay, 2)}</>}
                  </span>
                </div>
                <div>
                  <label>Depart</label>
                  <span>{(orbitTimeToGameTime(travelSolution.departureTime) || 0).toLocaleString()}</span>
                </div>
                <div>
                  <label>Arrive</label>
                  <span>{(orbitTimeToGameTime(travelSolution.arrivalTime) || 0).toLocaleString()}</span>
                </div>
              </TimingDetails>

            </FlexSection>
          </>
        )}

        {tab === 1 && (
          <ShipTab pilotCrew={{ ...crew, members: crewMembers }} ship={ships[0]} stage={stage} />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: insufficient propellant + anything else? */}
        goLabel="Schedule"
        onGo={onLaunch}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = ({ travelSolution, ...props }) => {
  const defaultOrigin = useStore(s => s.asteroids.origin);
  const defaultDestination = useStore(s => s.asteroids.destination);

  const { data: origin, isLoading: originIsLoading } = useAsteroid(travelSolution?.originId || defaultOrigin);
  const { data: destination, isLoading: destinationIsLoading } = useAsteroid(travelSolution?.destinationId || defaultDestination);
  
  // close dialog if cannot load both asteroids or if no travel solution
  useEffect(() => {
    if (!origin || !destination) {
      if (!originIsLoading && !destinationIsLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [origin, destination, originIsLoading, destinationIsLoading]);

  // const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      asteroid={origin}
      isLoading={originIsLoading || destinationIsLoading}
      onClose={props.onClose}
      stage={actionStage}>
      <SetCourse
        origin={origin}
        destination={destination}
        manager={manager}
        stage={actionStage}
        travelSolution={travelSolution}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
