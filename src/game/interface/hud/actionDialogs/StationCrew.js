import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Building, Ship } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, MyAssetIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

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
  CrewInputBlock,
  CrewOwnerBlock,
  SwayInput,
  SwayInputBlock,
  TransferDistanceDetails,
  TransferDistanceTitleDetails,
  ShipInputBlock
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import useCrew from '~/hooks/useCrew';
import useCrewMember from '~/hooks/useCrewMember';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import CrewIndicator from '~/components/CrewIndicator';

// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

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

  const { crew, crewMemberMap } = useCrewContext();

  // 
  const destinationLot = destinations[0]?.type === 'lot' ? destinations[0].data : null;
  const destinationShip = destinations[0]?.type === 'ship' ? destinations[0].data : null;
  
  const { data: ownerCrew } = useCrew(destinationShip?.owner || destinationLot?.occupier);
  const crewIsOwner = ownerCrew?.i === crew?.i;

  const crewMembers = currentStationing?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, lot?.i, destinationLot?.i || destinationShip?.lotId) || 0;

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
          : `Send to ${destinationLot?.building?.__t}`
      )
      : undefined;
    return { icon, label, status };
  }, [crewIsOwner, destinationLot, destinationShip, stage]);

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
                ship={{ ...Ship.TYPES[ship.type], ...ship }}
                disabled={stage !== actionStages.NOT_STARTED}
                isMine={crewIsOwner}
                hasMyCrew />
            )
            : (
              <FlexSectionInputBlock
                title="Origin"
                image={<BuildingImage building={Building.TYPES[lot?.building?.capableType || 0]} />}
                label={`${Building.TYPES[lot?.building?.capableType || 0].name}`}
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={`Lot #${lot?.i || 1}`}
              />
            )
          }

          <FlexSectionSpacer />

          {destinationShip
            ? (
              <ShipInputBlock
                title="Destination"
                titleDetails={
                  ship?.status !== 'IN_ORBIT' && destinationShip?.status === 'IN_ORBIT'
                  ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
                  : <TransferDistanceDetails distance={transportDistance} />
                }
                ship={{ ...Ship.TYPES[destinationShip.type], ...destinationShip }}
                disabled={stage !== actionStages.NOT_STARTED}
                isMine={destinationShip?.owner === crew?.i} />
            )
            : (
              <FlexSectionInputBlock
                title="Destination"
                titleDetails={
                  ship && ship.status === 'IN_ORBIT'
                    ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
                    : <TransferDistanceDetails distance={transportDistance} />
                }
                image={<BuildingImage building={Building.TYPES[destinationLot?.building?.capableType || 0]} />}
                label={`${Building.TYPES[destinationLot?.building?.capableType || 0].name}`}
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={`Lot #${destinationLot?.i || 1}`} />
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
            crew={{ ...crew, members: crewMembers }} />

          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {!crewIsOwner && <CrewIndicator crew={ownerCrew} />}
            {destinationShip && (
              <MiniBarChart
                color="#92278f"
                label="Crewmate Count"
                valueLabel={`7 / ${Ship.TYPES[destinationShip.type].maxPassengers}`}
                value={7 / Ship.TYPES[destinationShip.type].maxPassengers}
                deltaColor="#f644fa"
                deltaValue={crew?.crewMembers?.length / Ship.TYPES[destinationShip.type].maxPassengers}
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
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(crew?.station?.asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(crew?.station?.asteroidId, crew?.station?.lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(crew?.station?.shipId);
  
  const asteroidId = useStore(s => s.asteroids.origin);
  const { lotId } = useStore(s => s.asteroids.lot || {});
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  
  const { data: ships, isLoading: shipsLoading } = useAsteroidShips(asteroidId);
  const { data: destinationLot, isLoading: destLotIsLoading } = useLot(asteroidId, lotId);
  const { data: destinationShip, isLoading: destShipIsLoading } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined);

  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading || shipsLoading || destLotIsLoading || destShipIsLoading;

  // determine destinations options based on selection
  const destinations = useMemo(() => {
    if (isLoading) return [];

    let d = [];
    // if zoomedToShip, destinations.length = 1, destination is ship
    if (destinationShip) {
      d = [{ type: 'ship', data: destinationShip }];
  
    // if lot, destinations = ships (filter w/ guests), destination is [0]
    } else if (destinationLot) {
      d = ships
        .filter((s) => s.lotId === destinationLot.i && ['IN_PORT','ON_SURFACE'].includes(s.status) && !!props.guests === (s.owner !== crew?.i))
        .map((s) => ({ type: 'ship', data: s }));
  
      // if lot && !ships, if habitable, destinations.length = 1, destination is hab
      if (d.length === 0) {
        if (destinationLot.building?.station) {
          d = [{ type: 'lot', data: destinationLot }];
        }
      }
      
    // if !lot, destinations = ships in orbit (filter w/ guests), destinations is [0]
    } else {
      d = ships
        .filter((s) => s.status === 'IN_ORBIT' && !!props.guests === (s.owner !== crew?.i))
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
      isLoading={isLoading}
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
