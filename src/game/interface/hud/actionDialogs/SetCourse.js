import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Crew, Crewmate, Ship, Time } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, RotatedShipMarkerIcon, WarningOutlineIcon, MyAssetIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer } from '~/lib/utils';

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
  formatVelocity,
  ShipInputBlock
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
import formatters from '~/lib/formatters';

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

const TimingDetails = styled.div`
  align-self: flex-start;
  width: 50%;
  & > div {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
    color: white;
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
    padding: 4px 8px;
    & > label {
      flex: 1;
      font-size: 95%;
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

// TODO: fill in real numbers

const SetCourse = ({ origin, destination, manager, ship, stage, travelSolution, ...props }) => {
  const { coarseTime } = useContext(ClockContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentLaunch, flightStatus, startLaunch } = manager;

  const { crew, crewmateMap } = useCrewContext();

  const [tab, setTab] = useState(0);

  const crewmates = currentLaunch?._crewmates || (crew?.crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);
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
      if (flightStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = flightStatus;
  }, [flightStatus]);

  const delay = travelSolution.departureTime - coarseTime;
  useEffect(() => {
    if (flightStatus === 'READY' && delay <= 0) {
      createAlert({
        type: 'GenericAlert',
        content: 'Scheduled departure time has past.',
        level: 'warning',
        duration: 0,
      })
      props.onClose();
    }
  }, [delay]);
  

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <SetCourseIcon />,
          label: 'Set Course',
          status: stage === actionStages.NOT_STARTED ? 'Travel to Asteroid' : undefined,
        }}
        captain={captain}
        location={{ asteroid: origin, ship }}
        crewAvailableTime={arrivingIn}
        taskCompleteTime={arrivingIn}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.main : undefined}
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
                <label>{formatters.asteroidName(origin)}</label>
                <span>to</span>
                <label>{formatters.asteroidName(destination)}</label>
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
                    <span>Trip Delta-V: <b>{formatVelocity(travelSolution.deltaV, { minPrecision: 3 })}</b></span>
                  </CourseDeltaV>
                </Course>
                <AsteroidImage asteroid={destination} />
              </CourseRow>
            </Section>

            <FlexSection style={{ marginTop: 20 }}>
              <ShipInputBlock
                ship={ship}
                disabled={stage !== actionStages.NOT_STARTED}
                isMine />

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
                  <span>{(Time.fromOrbitADays(travelSolution.departureTime).toGameClockADays() || 0).toLocaleString()}</span>
                </div>
                <div>
                  <label>Arrive</label>
                  <span>{(Time.fromOrbitADays(travelSolution.arrivalTime).toGameClockADays() || 0).toLocaleString()}</span>
                </div>
              </TimingDetails>

            </FlexSection>

            <FlexSection style={{ marginBottom: -15 }}>
              <PropellantSection
                title="Requirements"
                propellantRequired={168e3}
                propellantLoaded={840e3}
                propellantMax={950e3}
              />
            </FlexSection>
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
  const manager = { flightStatus: 'READY' };
  const actionStage = actionStages.NOT_STARTED;

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={originIsLoading || destinationIsLoading}
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
