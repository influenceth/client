import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Building, Entity, Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { EjectPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { reactBool, formatTimer } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  AsteroidImage,
  MiniBarChart,
  CrewInputBlock,
  TransferDistanceTitleDetails,
  ShipInputBlock,
  WarningAlert,
  LotInputBlock
} from './components';
import useAsteroid from '~/hooks/useAsteroid';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import actionStages from '~/lib/actionStages';
import formatters from '~/lib/formatters';
import theme from '~/theme';
import { ActionDialogInner } from '../ActionDialog';

const EjectCrew = ({ asteroid, lot, manager, ship, stage, targetCrew, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewmateMap } = useCrewContext();

  const myCrewmates = currentStationing?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = myCrewmates[0];

  const myCrewIsTarget = targetCrew?.id === crew?.id;

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
      ? `Eject from ${ship ? 'Ship' : Building.TYPES[lot?.building?.Building?.buildingType]?.name}`
      : undefined;
    return { icon, label, status };
  }, [myCrewIsTarget, lot, ship, stage]);

  const shipIsInOrbit = ship?.Location?.location?.label === Entity.IDS.ASTEROID && ship?.Ship?.status !== Ship.STATUS.IN_FLIGHT;

  const maxPassengers = ship?.Station?.cap || 0;

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
              <LotInputBlock
                title="Origin"
                lot={lot}
                disabled={stage !== actionStages.NOT_STARTED} />
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
                valueLabel={`5 / ${maxPassengers || '?'}`}
                value={maxPassengers > 0 ? (5 / maxPassengers) : 1}
                deltaColor="#f644fa"
                deltaValue={maxPassengers > 0 ? (-targetCrew?.roster?.length / maxPassengers) : 0}
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

      {/* TODO: add waitForCrewReady? */}
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
  const originLotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const asteroidId = props.guests ? originAsteroid : crew?._location?.asteroidId;
  const lotId = props.guests ? originLotId : crew?._location?.lotId;
  const shipId = props.guests ? (zoomScene?.type === 'SHIP' && zoomScene.shipId) : crew?._location?.shipId;

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(shipId);

  // TODO: targetCrewId needs to be specified if guests (or we need to pass in an array of crews to select)
  const targetCrewId = props.guests ? null : crew?.id;
  const { data: targetCrew, isLoading: crewIsLoading } = useHydratedCrew(targetCrewId);

  // TODO: ...
  // const extractionManager = useExtractionManager(lot?.id);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading || crewIsLoading;
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
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <EjectCrew
        asteroid={asteroid}
        lot={lot}
        ship={ship}
        targetCrew={targetCrew}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
