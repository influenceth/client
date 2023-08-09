import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Building, Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, EjectPassengersIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, MyAssetIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { boolAttr, formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

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
  ShipInputBlock,
  WarningAlert,
  getBuildingInputDefaults
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import useCrew from '~/hooks/useCrew';
import useCrewmate from '~/hooks/useCrewmate';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import useCrewmates from '~/hooks/useCrewmates';
import formatters from '~/lib/formatters';

const EjectCrew = ({ asteroid, lot, manager, ship, stage, targetCrew, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewmateMap } = useCrewContext();

  const myCrewmates = currentStationing?._crewmates || (crew?.crewmates || []).map((i) => crewmateMap[i]);
  const captain = myCrewmates[0];

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
      ? `Eject from My ${ship ? 'Ship' : Building.TYPES[lot?.building?.Building?.buildingType]}`
      : undefined;
    return { icon, label, status };
  }, [myCrewIsTarget, lot, ship, stage]);

  const shipIsInOrbit = ship?.Location?.location?.label === 'Asteroid' && ship?.Ship?.status !== Ship.STATUS.IN_FLIGHT;

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={0}
        location={{ asteroid, lot, ship }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? (myCrewIsTarget ? theme.colors.main : theme.colors.red) : undefined}
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
              <FlexSectionInputBlock
                title="Origin"
                {...getBuildingInputDefaults(lot)}
                disabled={stage !== actionStages.NOT_STARTED}
              />
            )
          }

          <FlexSectionSpacer />

          <FlexSectionInputBlock
            title="Destination"
            titleDetails={
              !shipIsInOrbit && <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
            }  
            image={<AsteroidImage asteroid={asteroid} />}
            label={formatters.asteroidName(asteroid)}
            sublabel="Orbit"
            disabled
          />
        </FlexSection>

        <FlexSection>

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {ship && (
              <MiniBarChart
                color="#92278f"
                label="Crewmate Count"
                valueLabel={`5 / ${Ship.TYPES[ship.Ship.shipType].maxPassengers}`}
                value={5 / Ship.TYPES[ship.Ship.shipType].maxPassengers}
                deltaColor="#f644fa"
                deltaValue={-targetCrew?.crewmates?.length / Ship.TYPES[ship.Ship.shipType].maxPassengers}
              />
            )}
          </div>

          <FlexSectionSpacer />

          <CrewInputBlock
            title="Ejected Crew"
            crew={{ ...targetCrew, roster: targetCrew.crewmates }} />

        </FlexSection>

        {!shipIsInOrbit && (
          <FlexSection>
            <div style={{ width: '50%' }} />
            <FlexSectionSpacer />
            <div style={{ width: '50%' }}>
              <WarningAlert>
                <div><WarningOutlineIcon /></div>
                <div>Ejected crews must travel into orbit.</div>
              </WarningAlert>
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

  const asteroidId = props.guests ? originAsteroid : crew?._location?.asteroidId;
  const lotId = props.guests ? originLot?.lotId : crew?._location?.lotId;
  const shipId = props.guests ? (zoomScene?.type === 'SHIP' && zoomScene.shipId) : crew?._location?.shipId;

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(shipId);

  // TODO: targetCrewId needs to be specified if guests (or we need to pass in an array of crews to select)
  const targetCrewId = props.guests ? null : crew?.i;
  const { data: targetCrew, isLoading: crewIsLoading } = useCrew(targetCrewId);
  const { data: targetCrewmates, isLoading: targetCrewmatesLoading } = useCrewmates(targetCrew?.Crew?.roster || []);

  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading || crewIsLoading || targetCrewmatesLoading;
  useEffect(() => {
    if (!asteroid || (!lot && !ship) || !targetCrew) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={boolAttr(isLoading)}
      stage={actionStage}>
      <EjectCrew
        asteroid={asteroid}
        lot={lot}
        ship={ship}
        targetCrew={{ ...targetCrew, crewmates: targetCrewmates }}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
