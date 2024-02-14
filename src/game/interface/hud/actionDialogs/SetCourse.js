import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Crew, Crewmate, Product, Ship, Time } from '@influenceth/sdk';

import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, RotatedShipMarkerIcon, WarningOutlineIcon, MyAssetIcon } from '~/components/Icons';
import TimeComponent from '~/components/Time';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/actionManagers/useExtractionManager';
import { formatFixed, formatTimer, reactBool } from '~/lib/utils';

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
  ShipInputBlock,
  formatVolume
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewmateCardFramed from '~/components/CrewmateCardFramed';
import useAsteroid from '~/hooks/useAsteroid';
import ClockContext, { DISPLAY_TIME_FRACTION_DIGITS } from '~/contexts/ClockContext';
import formatters from '~/lib/formatters';
import useShipTravelManager from '~/hooks/actionManagers/useShipTravelManager';
import useShip from '~/hooks/useShip';

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
  & > div:first-child,
  & > div:last-child {
    flex: 0 0 92px;
  }
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
    line-height: 1em;
    margin-bottom: 4px;
    padding: 8px 8px;
    &:last-child {
      margin-bottom: 0px;
    }
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
      & i {
        font-size: 14px;
        font-style: normal;
        margin-left: 4px;
        opacity: 0.5;
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

const propellantProduct = Product.TYPES[Product.IDS.HYDROGEN_PROPELLANT];

const SetCourse = ({ origin, destination, manager, ship, stage, travelSolution, ...props }) => {
  const { coarseTime } = useContext(ClockContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchTravelMode = useStore(s => s.dispatchTravelMode);
  
  const { currentTravelAction, depart, arrive, travelStatus } = manager;
  const { crew } = useCrewContext();

  const [tab, setTab] = useState(0);

  const crewmates = currentTravelAction?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];
  
  const [shipConfig, cargoInv, propellantInv] = useMemo(() => {
    if (!ship) return [];
    const shipConfig = Ship.TYPES[ship.Ship.shipType];
    const cargoInv = ship.Inventories.find((inventory) => inventory.slot === shipConfig.cargoSlot);
    const propellantInv = ship.Inventories.find((inventory) => inventory.slot === shipConfig.propellantSlot);
    return [shipConfig, cargoInv, propellantInv];
  }, [ship]);


  const delay = useMemo(() => {
    return Math.max(0, travelSolution.departureTime - coarseTime) * 86400;
  }, [coarseTime, travelSolution]);

  const arrivingIn = useMemo(() => {
    return Math.max(0, travelSolution.arrivalTime - coarseTime);
  }, [coarseTime, travelSolution]);

  const propellantMassLoaded = useMemo(() => {
    if (!propellantInv) return 0;
    let totalMass = propellantInv.mass;
    if (currentTravelAction) totalMass += travelSolution.usedPropellantMass || 0;
    return totalMass;
  }, [currentTravelAction, propellantInv]);

  // TODO: should we apply bonus here? to solution deltaV?
  const deltaVLoaded = useMemo(() => {
    if (!ship || !propellantMassLoaded) return 0;
    const propellantBonus = 1;
    return Ship.Entity.propellantToDeltaV(ship, propellantMassLoaded, propellantBonus);
  }, [propellantMassLoaded, ship]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    const timeRequirement = currentTravelAction
      ? currentTravelAction.finishTime - currentTravelAction.startTime
      : Time.toRealDuration(arrivingIn * 86400, crew?._timeAcceleration);
    return [timeRequirement, timeRequirement];
  }, [currentTravelAction, arrivingIn, crew?._timeAcceleration]);

  const stats = useMemo(() => ([
    {
      label: 'Propellant Used',
      value: formatMass(travelSolution.usedPropellantMass),
      direction: 0
    },
    {
      label: 'Delta-V Used',
      value: formatVelocity(travelSolution.deltaV),
      direction: 0,
    },
    {
      label: 'Arriving In',
      value: formatTimer(arrivingIn, 3),
      direction: 0,
      isTimeStat: true,
    },
    // {
    //   label: 'Max Acceleration',
    //   value: <>1.712 m/s<sup>2</sup></>,
    //   direction: 0,
    // },
    {
      label: 'Wet Mass',
      value: formatMass(shipConfig.hullMass + propellantMassLoaded + cargoInv.mass),
      direction: 0,
    },
    {
      label: 'Dry Mass',
      value: formatMass(shipConfig.hullMass + propellantMassLoaded + cargoInv.mass - travelSolution.usedPropellantMass),
      direction: 0,
    },
    // {
    //   label: 'Cargo Volume',
    //   value: formatVolume(cargoInv.volume),
    //   direction: 0,
    // },
    {
      label: 'Passengers',
      value: ship.Station.population || 0,
      direction: 0,
    },
  ]), [arrivingIn, cargoInv, travelSolution, propellantInv, shipConfig]);

  const onDepart = useCallback(() => {
    depart();
  }, []);

  const onArrive = useCallback(() => {
    arrive();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change)
    if (lastStatus.current && travelStatus !== lastStatus.current) {
      // (close travel details)
      dispatchHudMenuOpened();
      dispatchTravelMode(false);
      props.onClose();
    }
    lastStatus.current = travelStatus;
  }, [travelStatus]);

  useEffect(() => {
    if (travelStatus === 'READY' && delay <= 0) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Scheduled departure time has past.' },
        level: 'warning',
        // duration: 0,
      });
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
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
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
                        {formatTimer(86400 * Time.toRealDuration(travelSolution.arrivalTime - travelSolution.departureTime, crew?._timeAcceleration), 2)}
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
                {travelStatus === 'READY' && (
                  <div>
                    <label>Departure Delay</label>
                    <span>
                      {delay > 300
                        ? <b><WarningOutlineIcon /> {formatTimer(delay, 2)}</b>
                        : <>{formatTimer(delay, 2)}</>}
                    </span>
                  </div>
                )}
                <div>
                  <label>Depart</label>
                  <span>
                    {(Time.fromOrbitADays(travelSolution.departureTime, crew._timeAcceleration).toGameClockADays() || 0).toLocaleString(undefined, { minimumFractionDigits: DISPLAY_TIME_FRACTION_DIGITS })}
                    <i>DAYS</i>
                  </span>
                </div>
                {travelStatus !== 'READY' && (
                  <div>
                    <label>Time in Flight</label>
                    <span>
                      {(travelSolution.arrivalTime - travelSolution.departureTime).toLocaleString(undefined, { minimumFractionDigits: DISPLAY_TIME_FRACTION_DIGITS })}
                      <i>DAYS</i>
                    </span>
                  </div>
                )}
                <div>
                  <label>Arrive</label>
                  <span>
                    {(Time.fromOrbitADays(travelSolution.arrivalTime, crew._timeAcceleration).toGameClockADays() || 0).toLocaleString(undefined, { minimumFractionDigits: DISPLAY_TIME_FRACTION_DIGITS })}
                    <i>DAYS</i>
                  </span>
                </div>
              </TimingDetails>

            </FlexSection>

            <FlexSection style={{ marginBottom: -15 }}>
              <PropellantSection
                title="Requirements"
                deltaVRequired={travelSolution.deltaV}
                deltaVLoaded={deltaVLoaded}
                propellantRequired={travelSolution.usedPropellantMass / propellantProduct.massPerUnit}
                propellantLoaded={propellantMassLoaded / propellantProduct.massPerUnit}
              />
            </FlexSection>
          </>
        )}

        {tab === 1 && (
          <ShipTab
            pilotCrew={{ ...crew, roster: crewmates }}
            deltas={{
              propellantMass: -travelSolution.usedPropellantMass,
              propellantVolume: -travelSolution.usedPropellantMass / propellantProduct.massPerUnit * propellantProduct.volumePerUnit,
            }}
            ship={ship}
            stage={stage} />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={propellantMassLoaded < travelSolution.usedPropellantMass}
        goLabel="Schedule"
        onGo={onDepart}
        finalizeLabel="Arrive"
        onFinalize={onArrive}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};

const Wrapper = ({ ...props }) => {
  const { crew } = useCrewContext();

  const manager = useShipTravelManager(crew?._location?.shipId);
  const { actionStage, currentTravelAction, currentTravelSolution, isLoading: solutionIsLoading } = manager;

  const defaultOrigin = useStore(s => s.asteroids.origin);
  const defaultDestination = useStore(s => s.asteroids.destination);
  const proposedTravelSolution = useStore(s => s.asteroids.travelSolution);

  const travelSolution = useMemo(() => currentTravelAction ? currentTravelSolution : proposedTravelSolution, [currentTravelAction, proposedTravelSolution]);

  const { data: origin, isLoading: originIsLoading } = useAsteroid(currentTravelAction?.originId || defaultOrigin);
  const { data: destination, isLoading: destinationIsLoading } = useAsteroid(currentTravelAction?.destinationId || defaultDestination);
  const { data: ship, isLoading: shipIsLoading } = useShip(crew?._location?.shipId);
  
  // close dialog if cannot load both asteroids or if no travel solution
  useEffect(() => {
    if (!origin || !destination || !ship) {
      if (!originIsLoading && !destinationIsLoading && !shipIsLoading) {
        console.log('not loaded', origin, destination, ship);
        if (props.onClose) props.onClose();
      }
    }

    if (!travelSolution) {
      if (!solutionIsLoading) {
        console.log('not loading');
        if (props.onClose) props.onClose();
      }
    }
  }, [origin, destination, originIsLoading, destinationIsLoading, travelSolution, solutionIsLoading]);

  const isLoading = originIsLoading || destinationIsLoading || shipIsLoading || !travelSolution;
  return (
    <ActionDialogInner
      actionImage="Travel"
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <SetCourse
        origin={origin}
        destination={destination}
        manager={manager}
        stage={actionStage}
        ship={ship}
        travelSolution={travelSolution}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
