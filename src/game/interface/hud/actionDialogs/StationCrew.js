import { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Asteroid, Building, Crew, Crewmate, Entity, Lot, Ship, Station } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { StationCrewIcon, StationPassengersIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { reactBool, formatTimer } from '~/lib/utils';

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
  LotInputBlock
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import useCrew from '~/hooks/useCrew';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import CrewIndicator from '~/components/CrewIndicator';

const Warning = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.orange)}, 0.3);
  color: ${p => p.theme.colors.orange};
  display: flex;
  flex-direction: row;
  padding: 10px;
  & > svg {
    font-size: 30px;
    margin-right: 12px;
  }
`;
const Note = styled.div`
  color: white;
  font-size: 95%;
  padding: 15px 10px 10px;
`;

const StationCrew = ({ asteroid, lot, destinations, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewmateMap } = useCrewContext();

  const destinationLot = destinations[0]?.type === 'lot' ? destinations[0].data : null;
  const destinationShip = destinations[0]?.type === 'ship' ? destinations[0].data : null;
  
  const { data: ownerCrew } = useCrew((destinationShip || destinationLot)?.Control.controller.id);
  const crewIsOwner = ownerCrew?.id === crew?.id;

  const crewmates = currentStationing?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crewmates);
  const launchBonus = 0;

  const transportDistance = Asteroid.getLotDistance(asteroid?.id, Lot.toIndex(lot?.id), Lot.toIndex(destinationLot?.id || destinationShip?.lotId)) || 0;

  const stats = useMemo(() => ([
    {
      label: 'Travel Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Crewmates Stationed',
      value: `5`,
      direction: 0,
    },
  ]), []);

  const onStation = useCallback(() => {
    stationOnShip();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (stationingStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = stationingStatus;
  }, [stationingStatus]);

  const actionDetails = useMemo(() => {
    const icon = destinationShip
      ? (crewIsOwner ? <StationCrewIcon /> : <StationPassengersIcon />)
      : <StationCrewIcon />;  // TODO: this should be station in habitat
    const label = destinationShip
      ? (crewIsOwner ? 'Station Flight Crew' : 'Station Passengers')
      : 'Station Crew';
    const status = stage === actionStages.NOT_STARTED
      ? (
        destinationShip
          ? `Send to ${crewIsOwner ? 'My ' : ''} Ship`
          : `Send to ${Building.TYPES[destinationLot?.building?.Building?.buildingType]?.name}`
      )
      : undefined;
    return { icon, label, status };
  }, [crewIsOwner, destinationLot, destinationShip, stage]);

  const isInOrbit = ship?.Location?.location?.label === Entity.IDS.ASTEROID && ship?.Ship?.status !== Ship.STATUS.IN_FLIGHT;
  const destIsInOrbit = destinationShip?.Location?.location?.label === Entity.IDS.ASTEROID && destinationShip?.Ship?.status !== Ship.STATUS.IN_FLIGHT;
  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={0}
        location={{ asteroid, lot, ship }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? (crewIsOwner ? theme.colors.main : theme.colors.green) : undefined}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          {ship
            ? (
              <ShipInputBlock
                title="Origin"
                ship={ship}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
            : (
              <LotInputBlock
                title="Origin"
                lot={lot}
                disabled={stage !== actionStages.NOT_STARTED}
              />
            )
          }

          <FlexSectionSpacer />

          {destinationShip
            ? (
              <ShipInputBlock
                title="Destination"
                titleDetails={
                  !isInOrbit && destIsInOrbit
                    ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
                    : <TransferDistanceDetails distance={transportDistance} />
                }
                ship={destinationShip}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
            : (
              <LotInputBlock
                title="Destination"
                titleDetails={
                  isInOrbit
                    ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
                    : <TransferDistanceDetails distance={transportDistance} />
                }
                lot={destinationLot}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
          }
        </FlexSection>

        <FlexSection>
          <CrewInputBlock
            title={
              destinationShip
              ? (crewIsOwner ? 'Flight Crew' : 'Passengers')
              : 'Stationed Crew'
            }
            crew={{ ...crew, roster: crewmates }} />

          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {!crewIsOwner && <CrewIndicator crew={ownerCrew} />}
            {destinationShip && (
              <MiniBarChart
                color="#92278f"
                label="Crewmate Count"
                valueLabel={`${destinationShip.Station.population} / ${Station.TYPES[destinationShip.Station.stationType].cap}`}
                value={destinationShip.Station.population / Station.TYPES[destinationShip.Station.stationType].cap}
                deltaColor="#f644fa"
                deltaValue={crew?.roster?.length / Station.TYPES[destinationShip.Station.stationType].cap}
              />
            )}
          </div>
        </FlexSection>

        {!crewIsOwner && (
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
        disabled={false/* TODO: no permission */}
        goLabel="Station"
        onGo={onStation}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { crew } = useCrewContext();
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(crew?._location?.asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(crew?._location?.lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(crew?._location?.shipId);
  
  const asteroidId = useStore(s => s.asteroids.origin);
  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  
  const { data: ships, isLoading: shipsLoading } = useAsteroidShips(asteroidId);  // TODO: do we need this?
  const { data: destinationLot, isLoading: destLotIsLoading } = useLot(lotId);
  const { data: destinationShip, isLoading: destShipIsLoading } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined);

  // TODO: if no station on destination ship or lot, then close

  // TODO: ...
  // const extractionManager = useExtractionManager(lot?.id);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading || shipsLoading || destLotIsLoading || destShipIsLoading;

  // determine destination options based on selection
  const destinations = useMemo(() => {
    if (isLoading) return [];

    let d = [];
    // if zoomedToShip, destinations.length = 1, destination is ship
    if (destinationShip) {
      d = [{ type: 'ship', data: destinationShip }];
  
    // if lot, destinations = ships (filter w/ guests boolean), destination is [0]
    } else if (destinationLot) {
      d = destinationLot.ships
        .filter((s) => 
          s.Station
          && s.Ship.status === Ship.STATUSES.AVAILABLE
          && s.Ship.operationMode === Ship.MODES.NORMAL
          && !!props.guests === (s.Control.controller.id !== crew?.id))
        .map((s) => ({ type: 'ship', data: s }));
  
      // if lot && !ships, if habitable, destinations.length = 1, destination is hab
      if (d.length === 0) {
        if (destinationLot.building?.Station) {
          d = [{ type: 'lot', data: destinationLot }];
        }
      }
      
    // if !lot, destinations = ships in orbit (filter w/ guests), destinations is [0]
    } else {
      d = ships
        .filter((s) => 
          s.Station
          && ship?.Location?.location?.label === Entity.IDS.ASTEROID
          && ship?.Location?.location?.id === asteroidId
          && ship?.Ship?.status !== Ship.STATUS.IN_FLIGHT
          && !!props.guests === (s.Control.controller.id !== crew?.id))
        .map((s) => ({ type: 'ship', data: s }));
    }

    return d;
  }, [isLoading]);

  useEffect(() => {
    if (!asteroid || (!lot && !ship) || destinations.length === 0) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <StationCrew
        asteroid={asteroid}
        lot={lot}
        ship={ship}
        destinations={destinations}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
