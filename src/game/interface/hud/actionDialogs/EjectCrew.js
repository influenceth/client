import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Capable } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, EjectPassengersIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, MyAssetIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
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
  MiniBarChartSection,
  ShipTab,
  CrewInputBlock,
  CrewOwnerBlock,
  SwayInput,
  CrewOwnerInner,
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
import useCrewMembers from '~/hooks/useCrewMembers';

// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

const Warning = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.red)}, 0.2);
  color: ${p => p.theme.colors.red};
  display: flex;
  flex-direction: row;
  font-size: 96%;
  padding: 10px;
  width: 100%;
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

const StationCrew = ({ asteroid, lot, manager, ship, stage, targetCrew, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const shipAssets = useShipAssets();
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewMemberMap } = useCrewContext();

  const myCrewMembers = currentStationing?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = myCrewMembers[0];

  const myCrewIsTarget = targetCrew?.i === crew?.i;

  const stats = useMemo(() => ([
    {
      label: 'Travel Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Crewmates Ejected',
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
    const icon = <EjectPassengersIcon />;
    const label = myCrewIsTarget ? 'Eject My Crew' : 'Force Eject Crew';
    const status = stage === actionStages.NOT_STARTED
      ? `Eject from My ${ship ? 'Ship' : lot?.building?.__t}`
      : undefined;
    return { icon, label, status };
  }, [myCrewIsTarget, lot, ship, stage]);

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={0}
        overrideColor={stage === actionStages.NOT_STARTED ? (myCrewIsTarget ? theme.colors.main : theme.colors.red) : undefined}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          {ship
            ? (
              <ShipInputBlock
                title="Origin"
                ship={{ ...shipAssets[ship.type], ...ship }}
                disabled={stage !== actionStages.NOT_STARTED}
                isMine
                hasMyCrew={ship.stationedCrews.includes(crew?.i)} />
            )
            : (
              <FlexSectionInputBlock
                title="Origin"
                image={<BuildingImage building={buildings[lot?.building?.capableType || 0]} />}
                label={`${buildings[lot?.building?.capableType || 0].name}`}
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={`Lot #${lot?.i || 1}`}
              />
            )
          }

          <FlexSectionSpacer />

          <FlexSectionInputBlock
            title="Destination"
            titleDetails={
              !(ship && ship.status === 'IN_ORBIT') && <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
            }  
            image={<AsteroidImage asteroid={asteroid} />}
            label={asteroid?.customName || asteroid?.baseName || `Asteroid #${asteroid.i}`}
            sublabel="Orbit"
          />
        </FlexSection>

        <FlexSection>

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {ship && (
              <MiniBarChart
                color="#92278f"
                label="Crewmate Count"
                valueLabel={`5 / ${shipAssets[ship.type].maxPassengers}`}
                value={5 / shipAssets[ship.type].maxPassengers}
                deltaColor="#f644fa"
                deltaValue={-targetCrew?.crewMembers?.length / shipAssets[ship.type].maxPassengers}
              />
            )}
          </div>

          <FlexSectionSpacer />

          <CrewInputBlock
            title="Ejected Crew"
            crew={{ ...targetCrew, members: targetCrew.crewMembers }} />

        </FlexSection>

        {!(ship && ship.status === 'IN_ORBIT') && (
          <FlexSection>
            <div style={{ width: '50%' }} />
            <FlexSectionSpacer />
            <div style={{ width: '50%' }}>
              <Warning>
                <WarningOutlineIcon />
                <div>Ejected crews must travel into orbit.</div>
              </Warning>
            </div>
          </FlexSection>
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: no permission */}
        goLabel="Eject"
        onGo={onStation}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { crew } = useCrewContext();

  const originAsteroid = useStore(s => s.asteroids.origin);
  const originLot = useStore(s => s.asteroids.lot || {});
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const asteroidId = props.guests ? originAsteroid : crew?.station?.asteroidId;
  const lotId = props.guests ? originLot?.lotId : crew?.station?.lotId;
  const shipId = props.guests ? (zoomScene?.type === 'SHIP' && zoomScene.shipId) : crew?.station?.shipId;

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(shipId);

  const targetCrewId = props.guests ? ship?.stationedCrews.find((c) => c !== crew?.i) : crew?.i;
  const { data: targetCrew, isLoading: crewIsLoading } = useCrew(targetCrewId);
  const { data: targetCrewMembers, isLoading: targetCrewMembersLoading } = useCrewMembers(targetCrew?.crewMembers ? { ids: targetCrew?.crewMembers.join(',') } : []);

  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading || crewIsLoading || targetCrewMembersLoading;
  useEffect(() => {
    if (!asteroid || (!lot && !ship)) {// || !targetCrew) { // TODO: restore this
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      asteroid={asteroid}
      lot={lot}
      ship={ship}
      isLoading={isLoading}
      onClose={props.onClose}
      overrideColor={actionStage === actionStages.NOT_STARTED && (props.guests ? theme.colors.red : theme.colors.main)}
      stage={actionStage}>
      <StationCrew
        asteroid={asteroid}
        lot={lot}
        ship={ship}
        targetCrew={{ ...targetCrew, crewMembers: targetCrewMembers }}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
