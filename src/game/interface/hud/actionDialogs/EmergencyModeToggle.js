import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CloseIcon, CoreSampleIcon, EjectPassengersIcon, EmergencyModeEnterIcon, EmergencyModeExitIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, MyAssetIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
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

const EmergencyModeToggle = ({ asteroid, lot, manager, ship, stage, targetCrew, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const shipAssets = useShipAssets();
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewMemberMap } = useCrewContext();

  const crewMembers = currentStationing?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];

  const stats = useMemo(() => ([
    {
      label: 'Action Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Propellant Mass Jettisoned',
      value: 0,
      direction: 0,
    },
    {
      label: 'Propellant Volume Jettisoned',
      value: 0,
      direction: 0,
    },
    {
      label: 'Cargo Mass Jettisoned',
      value: 0,
      direction: 0,
    },
    {
      label: 'Cargo Volume Jettisoned',
      value: 0,
      direction: 0,
    },
  ]), [ship]);

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
    const icon = ship?.inEmergencyMode ? <EmergencyModeExitIcon /> : <EmergencyModeEnterIcon />;
    const label = `${ship?.inEmergencyMode ? 'Exit' : 'Enter'} Emergency Mode`;
    const status = stage === actionStages.NOT_STARTED
      ? `${ship?.inEmergencyMode ? 'Restore' : 'Prepare'} Ship`
      : undefined;
    return { icon, label, status };
  }, [ship, stage]);

  const warnings = useMemo(() => {
    const w = [];
    if (ship.inEmergencyMode) {
      w.push({
        icon: <WarningOutlineIcon />,
        text: `WARNING: A ship must jettison up to 10% of its propellant when exiting Emergency Mode.`
      });
    } else {
      w.push({
        icon: <WarningOutlineIcon />,
        text: `WARNING: All cargo in the ship's cargo hold will be jettisoned. This action is irreversible.`
      });
      if (ship.stationedCrews.find((c) => c !== crew?.i)) {
        w.push({
          icon: <CloseIcon />,
          text: 'All passengers must be ejected before the ship can enter Emergency Mode.'
        });
      }
    }
    
    return w;
  }, [ship, crew?.i]);

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={0}
        location={{ asteroid, lot, ship }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.orange : undefined}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>
        {/* TODO: set cargo's to zero and make sure delta is shown */}
        <ShipTab
          pilotCrew={{ ...crew, members: crewMembers }}
          ship={{ ...ship, }}
          stage={stage}
          warnings={warnings} />

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: no permission */}
        goLabel={ship.inEmergencyMode ? 'Restore' : 'Prepare'}
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
      isLoading={isLoading}
      stage={actionStage}>
      <EmergencyModeToggle
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
