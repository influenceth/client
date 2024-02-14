import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building, Entity, Ship, Station } from '@influenceth/sdk';

import { EjectPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { reactBool, formatTimer, locationsArrToObj } from '~/lib/utils';

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
  CrewSelectionDialog
} from './components';
import useEjectCrewManager from '~/hooks/actionManagers/useEjectCrewManager';
import useAsteroid from '~/hooks/useAsteroid';
import useEntity from '~/hooks/useEntity';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import actionStages from '~/lib/actionStages';
import formatters from '~/lib/formatters';
import theme from '~/theme';
import { ActionDialogInner } from '../ActionDialog';

const EjectCrew = ({ asteroid, origin, originLot, manager, stage, ...props }) => {
  const { currentEjection, ejectCrew, actionStage: ejectionStatus } = manager;
  
  // TODO: only if specified id
  const { crew } = useCrewContext();

  const [crewSelectorOpen, setCrewSelectorOpen] = useState(false);
  const [targetCrewId, setTargetCrewId] = useState(currentEjection?.ejected_crew?.id || (props.guests || props.guestId ? (props.guestId || null) : crew?.id));

  const { data: targetCrew } = useHydratedCrew(targetCrewId);

  const myCrewmates = currentEjection?._crewmates || crew?._crewmates || [];
  const captain = myCrewmates[0];

  const myCrewIsTarget = targetCrew?.id === crew?.id;

  const stats = useMemo(() => ([
    {
      label: 'Crewmates Ejected',
      value: (targetCrew?.Crew?.roster || []).length,
      direction: 0,
    },
  ]), [targetCrew]);

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
    const icon = <EjectPassengersIcon />;
    const label = myCrewIsTarget ? 'Eject My Crew' : 'Force Eject Crew';
    const status = stage === actionStages.NOT_STARTED
      ? `From ${origin.Ship ? Ship.TYPES[origin.Ship.shipType]?.name : Building.TYPES[origin.Building?.buildingType]?.name}`
      : undefined;
    return { icon, label, status };
  }, [myCrewIsTarget, origin, stage]);

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={0}
        location={{ asteroid, lot: originLot, ship: origin.Ship ? origin : undefined }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? (myCrewIsTarget ? theme.colors.main : theme.colors.red) : undefined}
        taskCompleteTime={0}
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

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
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

          {/* TODO: only selectable if i control the ship */}
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
        disabled={!targetCrew}
        goLabel="Eject"
        onGo={onEject}
        stage={stage}
        waitForCrewReady
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <CrewSelectionDialog
          crews={[]}
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

  // NOTE: use props.originId for guests
  const originId = useMemo(() => props.originId || crew?.Location?.location, [crew?.Location?.location, props.originId]);
  const { data: origin, isLoading: entityIsLoading } = useEntity(originId);
  const originLocation = useMemo(() => locationsArrToObj(origin?.Location?.locations || []), [origin]);
  
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(originLocation?.asteroidId);
  const { data: originLot, isLoading: lotIsLoading } = useLot(originLocation?.lotId);

  const ejectCrewManager = useEjectCrewManager(originId);

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
        origin={origin}
        originLot={originLot}
        manager={manager}
        stage={manager.actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
