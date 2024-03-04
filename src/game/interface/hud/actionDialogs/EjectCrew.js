import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Building, Crewmate, Permission, Ship, Station, Time } from '@influenceth/sdk';

import { EjectMyCrewIcon, EjectPassengersIcon, WarningIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useStationedCrews from '~/hooks/useStationedCrews';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses } from '~/lib/utils';

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
  LotInputBlock,
  CrewSelectionDialog,
  TimeBonusTooltip,
  getBonusDirection,
  ProgressBarSection
} from './components';
import useEjectCrewManager from '~/hooks/actionManagers/useEjectCrewManager';
import useAsteroid from '~/hooks/useAsteroid';
import useEntity from '~/hooks/useEntity';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';
import formatters from '~/lib/formatters';
import theme from '~/theme';
import { ActionDialogInner } from '../ActionDialog';

const EjectCrew = ({ asteroid, origin, originLot, stationedCrews, manager, stage, ...props }) => {
  const { currentEjection, ejectCrew, actionStage: ejectionStatus } = manager;

  // TODO: only if specified id
  const { crew } = useCrewContext();

  const [crewSelectorOpen, setCrewSelectorOpen] = useState(false);
  const [targetCrewId, setTargetCrewId] = useState(currentEjection?.ejected_crew?.id || (props.guests || props.guestId ? (props.guestId || null) : crew?.id));

  const { data: targetCrew } = useHydratedCrew(targetCrewId);
  const myCrewmates = currentEjection?._crewmates || crew?._crewmates || [];
  const captain = myCrewmates[0];

  const myCrewIsTarget = targetCrew?.id === crew?.id;

  const hopperBonus = useMemo(() => getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew), [crew]);

  const ejectionTime = useMemo(() => {
    if (myCrewIsTarget && originLot) {
      return Time.toRealDuration(Asteroid.getLotTravelTime(asteroid?.id, originLot.index, 0, hopperBonus.totalBonus), crew?._timeAcceleration);
    }
    return 0;
  }, [myCrewIsTarget, asteroid, crew?._timeAcceleration, hopperBonus, originLot]);

  const stats = useMemo(() => ([
    ejectionTime > 0 && {
      label: 'Time to Orbit',
      value: formatTimer(ejectionTime),
      direction: getBonusDirection(hopperBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={hopperBonus}
          title="Time to Orbit"
          totalTime={ejectionTime} />
      )
    },
    {
      label: 'Crewmates Ejected',
      value: (targetCrew?.Crew?.roster || []).length,
      direction: 0,
    },
  ]), [targetCrew]);

  const hasPermission = useMemo(() => {
    if (targetCrewId && origin) {
      const perm = Permission.getPolicyDetails(origin, targetCrewId)[Permission.IDS.STATION_CREW];
      return perm ? perm.crewStatus === 'controller' || perm.crewStatus === 'granted' : false;
    }

    return false;
  }, [targetCrewId, origin]);

  const onEject = useCallback(() => {
    ejectCrew(targetCrewId);
  }, [targetCrewId]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (lastStatus.current && ejectionStatus !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = ejectionStatus;
  }, [ejectionStatus]);

  const actionDetails = useMemo(() => {
    const icon = myCrewIsTarget ? <EjectMyCrewIcon /> : <EjectPassengersIcon />;
    const label = myCrewIsTarget ? 'Eject My Crew' : 'Force Eject Crew';
    const status = stage === actionStages.NOT_STARTED
      ? `From ${origin.Ship ? Ship.TYPES[origin.Ship.shipType]?.name : Building.TYPES[origin.Building?.buildingType]?.name}`
      : undefined;
    return { icon, label, status };
  }, [myCrewIsTarget, origin, stage]);

  const allowAction = useMemo(() => {
    if (myCrewIsTarget && targetCrew) return true;
    if (!myCrewIsTarget && targetCrew && !hasPermission) return true;
    return false;
  }, [myCrewIsTarget, targetCrew, hasPermission]);

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={ejectionTime}
        location={{ asteroid, lot: originLot, ship: origin.Ship ? origin : undefined }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? (myCrewIsTarget ? theme.colors.main : theme.colors.red) : undefined}
        taskCompleteTime={ejectionTime}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          {origin.Ship
            ? (
              <ShipInputBlock
                title="Origin"
                ship={origin}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
            : (
              <LotInputBlock
                title="Origin"
                lot={originLot}
                disabled={stage !== actionStages.NOT_STARTED} />
            )
          }

          <FlexSectionSpacer />

          {/* TODO: can a crew be ejected from ship while in flight? */}
          <FlexSectionInputBlock
            title="Destination"
            titleDetails={
              originLot && <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
            }
            image={<AsteroidImage asteroid={asteroid} />}
            label={formatters.asteroidName(asteroid)}
            sublabel="Orbit"
            disabled
          />
        </FlexSection>

        <FlexSection>

          <div style={{ alignSelf: 'flex-start', paddingTop: 4, width: '50%' }}>
            {origin && targetCrew && (
              <MiniBarChart
                color="#92278f"
                label="Crewmate Count"
                valueLabel={`${origin.Station.population - (targetCrew.Crew?.roster?.length || 0)} / ${Station.TYPES[origin.Station.stationType].cap}`}
                value={(origin.Station.population - (targetCrew.Crew?.roster?.length || 0)) / Station.TYPES[origin.Station.stationType].cap}
                deltaColor="#f644fa"
                deltaValue={-(targetCrew.Crew?.roster?.length || 0) / Station.TYPES[origin.Station.stationType].cap}
              />
            )}
          </div>

          <FlexSectionSpacer />

          {/* TODO: only selectable if I control the ship */}
          <CrewInputBlock
            title={targetCrew ? "Ejected Crew" : "Select Crew to Eject"}
            crew={targetCrew ? { ...targetCrew, roster: targetCrew._crewmates } : undefined}
            select
            isSelected={props.guests && (stage === actionStages.NOT_STARTED)}
            onClick={props.guests ? () => setCrewSelectorOpen(true) : undefined}
            subtle
          />

        </FlexSection>

        {originLot && (
          <>
            {myCrewIsTarget
              ? (
                <>
                  <ProgressBarSection
                    overrides={{
                      barColor: theme.colors.error,
                      color: theme.colors.error,
                      left: <><WarningIcon /> Emergency Escape to Orbit</>,
                      right: formatTimer(ejectionTime)
                    }}
                    stage={stage}
                    title="Travel Time"
                  />
                  <div style={{ color: theme.colors.red, fontSize: '95%', padding: '12px 0 24px', textAlign: 'center' }}>
                    Crews will become unstationed in orbit. Travel time is proportional to asteroid size.
                  </div>
                </>
              )
              : (
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
              )
            }
          </>
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!allowAction}
        goLabel="Eject"
        onGo={onEject}
        stage={stage}
        waitForCrewReady
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <CrewSelectionDialog
          crews={stationedCrews || []}
          onClose={() => setCrewSelectorOpen(false)}
          onSelected={setTargetCrewId}
          open={crewSelectorOpen}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { crew } = useCrewContext();

  // NOTE: use props.origin for guests
  const originEntity = useMemo(() => props.origin || crew?.Location?.location, [crew?.Location?.location, props.origin]);
  const { data: allStationedCrews } = useStationedCrews(originEntity, true);
  const { data: origin, isLoading: entityIsLoading } = useEntity(originEntity);
  const originLocation = useMemo(() => locationsArrToObj(origin?.Location?.locations || []), [origin]);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(originLocation?.asteroidId);
  const { data: originLot, isLoading: lotIsLoading } = useLot(originLocation?.lotId);

  const ejectCrewManager = useEjectCrewManager(origin);

  // ejection is weird, so create a psuedo manager to make it seem more normal
  const manager = useMemo(() => {
    const currentEjection = ejectCrewManager.currentEjections?.[0];  // TODO: ...
    return {
      ejectCrew: ejectCrewManager.ejectCrew,
      currentEjection,
      actionStage: currentEjection ? actionStages.STARTING : actionStages.NOT_STARTED,
    };
  }, [ejectCrewManager]);

  const isLoading = entityIsLoading || asteroidIsLoading || lotIsLoading;
  useEffect(() => {
    if (!origin) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [origin, isLoading]);

  return (
    <ActionDialogInner
      actionImage="Travel"
      isLoading={reactBool(isLoading)}
      stage={manager.actionStage}>
      <EjectCrew
        asteroid={asteroid}
        stationedCrews={allStationedCrews}
        origin={origin}
        originLot={originLot}
        manager={manager}
        stage={manager.actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
