import { useCallback, useEffect, useMemo, useRef } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Asteroid, Building, Crewmate, Entity, Permission, Station, Time } from '@influenceth/sdk';

import { StationCrewIcon, StationPassengersIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  FlexSection,
  FlexSectionSpacer,
  MiniBarChart,
  CrewInputBlock,
  SwayInputBlock,
  TransferDistanceDetails,
  TransferDistanceTitleDetails,
  ShipInputBlock,
  LotInputBlock,
  getBonusDirection,
  TimeBonusTooltip
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import useCrew from '~/hooks/useCrew';
import useAsteroid from '~/hooks/useAsteroid';
import CrewIndicator from '~/components/CrewIndicator';
import useStationCrewManager from '~/hooks/actionManagers/useStationCrewManager';
import useEntity from '~/hooks/useEntity';

const StationCrew = ({ asteroid, destination: rawDestination, lot, origin: rawOrigin, stationCrewManager, stage, ...props }) => {
  const { stationCrew } = stationCrewManager;
  const { crew, crewCan } = useCrewContext();

  const crewmates = (crew?._crewmates || []);
  const captain = crewmates[0];

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const origin = useMemo(() => {
    if (!rawOrigin) return null;
    const newOrigin = cloneDeep(rawOrigin);
    newOrigin._location = locationsArrToObj(newOrigin?.Location?.locations || []);
    newOrigin._inOrbit = !newOrigin?._location.lotId;
    newOrigin._crewOwned = newOrigin?.Control?.controller?.id === crew?.id;
    return newOrigin;
  }, [rawOrigin]);

  const destination = useMemo(() => {
    if (!rawDestination) return null;
    const newDestination = cloneDeep(rawDestination);
    newDestination._location = locationsArrToObj(newDestination?.Location?.locations || []);
    newDestination._inOrbit = !newDestination?._location.lotId;
    newDestination._crewOwned = newDestination?.Control?.controller?.id === crew?.id;
    return newDestination;
  }, [rawDestination]);

  const crewIsOwner = destination?.Control?.controller?.id === crew?.id;

  const { data: destinationOwner } = useCrew(destination?.Control?.controller?.id);
  const { data: destinationLot } = useLot(destination?._location?.lotId);
  const { data: originLot } = useLot(origin?._location?.lotId);

  const [travelDistance, travelTime] = useMemo(() => {
    if (!origin._location || !destination._location) return [0, 0];
    return [
      Asteroid.getLotDistance(asteroid?.id, origin._location.lotIndex, destination._location.lotIndex),
      Time.toRealDuration(
        Asteroid.getLotTravelTime(asteroid?.id, origin._location.lotIndex, destination._location.lotIndex, crewTravelBonus.totalBonus),
        crew?._timeAcceleration
      )
    ];
  }, [asteroid?.id, origin?.id, destination?.id, crewTravelBonus, crew?._timeAcceleration]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [ travelTime, 0 ];
  }, [travelTime]);

  const stats = useMemo(() => ([
    {
      label: 'Travel Time',
      value: formatTimer(travelTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
          title="Transport Time"
          totalTime={travelTime}
          crewRequired="start" />
      )
    },
    {
      label: 'Crewmates Restationed',
      value: crew?._crewmates?.length || 0,
      direction: 0,
    },
  ]), [crewTravelBonus, travelTime]);

  const onStation = useCallback(() => {
    stationCrew();
  }, [stationCrew]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && stage !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = stage;
  }, [stage]);

  const actionDetails = useMemo(() => {
    const icon = destination?.label === Entity.IDS.SHIP && !crewIsOwner
      ? <StationPassengersIcon />
      : <StationCrewIcon />;
    const label = destination?.label === Entity.IDS.SHIP
      ? (crewIsOwner ? 'Station Flight Crew' : 'Station Passengers')
      : 'Station Crew';
    const status = stage === actionStages.NOT_STARTED
      ? (
        destination?.label === Entity.IDS.SHIP
          ? `Send to ${crewIsOwner ? 'My ' : ''} Ship`
          : `Send to ${Building.TYPES[destination?.Building?.buildingType]?.name}`
      )
      : undefined;
    return { icon, label, status };
  }, [crewIsOwner, destination, stage]);

  const stationConfig = destination ? Station.TYPES[destination.Station.stationType] : null;

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        location={{
          asteroid,
          lot,
          ship: destination?.label === Entity.IDS.SHIP ? destination : null
        }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? (crewIsOwner ? theme.colors.main : theme.colors.green) : undefined}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          {(origin.label === Entity.IDS.SHIP || !originLot)
            ? (
              <ShipInputBlock
                title="Origin"
                ship={origin.label === Entity.IDS.SHIP ? origin : crew}
                disabled />
            )
            : (
              <LotInputBlock
                title="Origin"
                lot={originLot}
                disabled
              />
            )
          }

          <FlexSectionSpacer />

          {destination.label === Entity.IDS.SHIP
            ? (
              <ShipInputBlock
                title="Destination"
                titleDetails={
                  origin._location.lotIndex === 0 && destination._location.lotIndex === 0
                    ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
                    : <TransferDistanceDetails distance={travelDistance} crewTravelBonus={crewTravelBonus} />
                }
                ship={destination}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
            : (
              <LotInputBlock
                title="Destination"
                titleDetails={
                  origin._location.lotIndex === 0 && destination._location.lotIndex === 0
                    ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
                    : <TransferDistanceDetails distance={travelDistance} crewTravelBonus={crewTravelBonus} />
                }
                lot={destinationLot}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
          }
        </FlexSection>

        <FlexSection>
          <CrewInputBlock
            title={
              destination.label === Entity.IDS.SHIP
                ? (crewIsOwner ? 'Flight Crew' : 'Passengers')
                : 'Stationed Crew'
            }
            crew={{ ...crew, roster: crewmates }} />

          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', width: '50%', overflow: 'hidden' }}>
            {!crewIsOwner && <CrewIndicator crew={destinationOwner} />}
            {destination && (
              <MiniBarChart
                color="#92278f"
                label="Crewmate Count"
                valueLabel={`${destination.Station.population + crew?.Crew?.roster?.length} / ${Station.TYPES[destination.Station.stationType].cap}`}
                value={(destination.Station.population + crew?.Crew?.roster?.length) / Station.TYPES[destination.Station.stationType].cap}
                deltaColor="#f644fa"
                deltaValue={crew?.Crew?.roster?.length / Station.TYPES[destination.Station.stationType].cap}
              />
            )}
          </div>
        </FlexSection>

        {/* turn this back on when payments are supported */}
        {false && !crewIsOwner && (
          <FlexSection style={{ alignItems: 'flex-start' }}>
            <SwayInputBlock
              title="Sway Payment"
              instruction="OPTIONAL: Include with transfer" />

            <FlexSectionSpacer />

            <div style={{ width: '50%' }} />

          </FlexSection>
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={
          !destination ||
          !stationConfig ||
          !crewCan(Permission.IDS.STATION_CREW, destination) ||
          (stationConfig.cap && destination.Station.population + crew?.Crew?.roster?.length > stationConfig.cap)
        }
        goLabel="Station"
        onGo={onStation}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { crew, loading: crewIsLoading } = useCrewContext();

  const originEntityId = crew?.Location?.location;

  const asteroidId = useStore(s => s.asteroids.origin);
  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(lotId);

  const destinationEntityId = useMemo(() => {
    if (props.destinationEntityId) return props.destinationEntityId;

    if (zoomScene?.type === 'SHIP' && zoomScene.shipId) {
      return { label: Entity.IDS.SHIP, id: zoomScene.shipId };
    } else if (lot?.building && lot?.building?.Building?.buildingType === Building.IDS.HABITAT) {
      return { label: Entity.IDS.BUILDING, id: lot?.building.id };
    } else if (lot?.surfaceShip) {
      return { label: Entity.IDS.SHIP, id: lot?.surfaceShip.id };
    } else if (lot?.ships?.length === 1) {
      return { label: Entity.IDS.SHIP, id: lot?.ships[0].id };
    } else if (lotId) {
      return { label: Entity.IDS.LOT, id: lotId };
    }

    return { label: Entity.IDS.ASTEROID, id: asteroidId };
  }, [asteroidId, lot?.building, lot?.surfaceShip, lotId, zoomScene]);

  const { data: destination, isLoading: destIsLoading } = useEntity(destinationEntityId);
  const { data: origin, isLoading: originIsLoading } = useEntity(originEntityId);

  const stationCrewManager = useStationCrewManager(destinationEntityId);
  const { actionStage } = stationCrewManager;

  const isLoading = asteroidIsLoading || crewIsLoading || destIsLoading || lotIsLoading || originIsLoading;

  useEffect(() => {
    if (!origin || !destination) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [origin, destination, isLoading]);

  return (
    <ActionDialogInner
      actionImage="CrewManagement"
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <StationCrew
        asteroid={asteroid}
        lot={lot}
        origin={origin}
        destination={destination}
        stationCrewManager={stationCrewManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
