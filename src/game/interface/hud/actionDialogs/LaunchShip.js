import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crewmate, Inventory, Lot, Product, Ship, Time } from '@influenceth/sdk';

import { LaunchShipIcon, RouteIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { reactBool, formatFixed, formatTimer, getCrewAbilityBonuses } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  ProgressBarSection,
  AsteroidImage,
  ProgressBarNote,
  PropellantSection,
  ShipTab,
  PropulsionTypeSection,
  LotInputBlock,
  formatMass,
  MaterialBonusTooltip
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import formatters from '~/lib/formatters';
import useShip from '~/hooks/useShip';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';
import useAsteroid from '~/hooks/useAsteroid';
import { getBonusDirection } from './components';
import { TimeBonusTooltip } from './components';
import useStationedCrews from '~/hooks/useStationedCrews';


const propellantProduct = Product.TYPES[Product.IDS.HYDROGEN_PROPELLANT];

const LaunchShip = ({ asteroid, originLot, manager, ship, shipCrews, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { currentUndockingAction, undockShip } = manager;
  const { crew } = useCrewContext();

  const isForceLaunch = crew?.id !== ship?.Control?.controller?.id;
  // TODO: in event of self-piloted launch, need to update with cached crew values on flightCrew (just like in other action dialogs while waiting on an action)
  const flightCrew = useMemo(() => shipCrews.find((c) => c.id === ship.Control?.controller?.id), [shipCrews, ship]);

  // TODO: should this default to hopper-assisted if no propellant?
  const [powered, setPowered] = useState(isForceLaunch ? false : true);
  const [tab, setTab] = useState(0);

  const crewmates = currentUndockingAction?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];

  const [hopperBonus, propellantBonus] = useMemo(() => {
    if (!flightCrew) return {};
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, Crewmate.ABILITY_IDS.PROPELLANT_EXHAUST_VELOCITY];
    const abilities = getCrewAbilityBonuses(bonusIds, flightCrew) || {};
    return bonusIds.map((id) => abilities[id] || {});
  }, [flightCrew]);

  const [escapeVelocity, propellantRequirement, poweredTime, tugTime] = useMemo(() => {
    if (!ship || !asteroid) return [0, 0, 0, 0];
    const escapeVelocity = Asteroid.Entity.getEscapeVelocity(asteroid) * 1000;
    const propellantRequired = Ship.Entity.getPropellantRequirement(ship, escapeVelocity, propellantBonus.totalBonus);
    const originLotIndex = Lot.toIndex(originLot?.id);
    return [
      escapeVelocity,
      propellantRequired,
      0, // TODO: poweredTime may be a thing in the future
      Time.toRealDuration(Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, 0, hopperBonus.totalBonus), crew?._timeAcceleration)
    ];
  }, [asteroid, hopperBonus, originLot?.id, powered, propellantBonus, ship]);

  const isDeliveryPending = useMemo(() => !!(ship?.Inventories || []).find((inv) => inv.reservedMass > 0), [ship])

  const [propellantLoaded, deltaVLoaded] = useMemo(() => {
    if (!ship) return [0, 0];
    const shipConfig = Ship.TYPES[ship.Ship.shipType];
    const propellantMass = (ship.Inventories || []).find((inv) => inv.slot === shipConfig.propellantSlot)?.mass || 0;
    const deltaV = Ship.Entity.propellantToDeltaV(ship, propellantMass, hopperBonus.totalBonus);
    return [
      propellantMass,
      deltaV
    ];
  }, [ship]);

  const launchTime = useMemo(() => powered ? poweredTime : tugTime, [powered, poweredTime, tugTime]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [ 0, launchTime ];
  }, [launchTime]);

  const stats = useMemo(() => ([
    {
      label: 'Time until Orbit',
      value: formatTimer(launchTime),
      direction: launchTime > 0 ? getBonusDirection(hopperBonus) : 0,
      isTimeStat: true,
      tooltip: hopperBonus.totalBonus !== 1 && launchTime > 0 && (
        <TimeBonusTooltip
          bonus={hopperBonus}
          title="Time until Orbit"
          totalTime={launchTime}
          crewRequired="duration" />
      )
    },
    {
      label: 'Propellant Used',
      value: powered ? formatMass(propellantRequirement) : 0,
      direction: powered && propellantRequirement > 0 ? getBonusDirection(propellantBonus) : 0,
      isTimeStat: true,
      tooltip: propellantRequirement > 0 && propellantBonus.totalBonus !== 1 && (
        <MaterialBonusTooltip
          bonus={propellantBonus}
          isTimeStat
          title="Propellant Utilization"
          titleValue={`${formatFixed(100 / propellantBonus.totalBonus, 1)}%`} />
      )
    },
    {
      label: 'Escape Velocity',
      value: `${formatFixed(escapeVelocity, 1)} m/s`,
      direction: 0,
    },
    {
      label: 'Wet Mass',
      value: formatMass(
        Ship.TYPES[ship.Ship.shipType].hullMass
        + ship.Inventories.reduce((acc, inv) => acc + (inv.status === Inventory.STATUSES.AVAILABLE ? inv.mass : 0), 0)
      ),
      direction: 0,
    },
  ]), [escapeVelocity, hopperBonus, launchTime, propellantBonus, propellantRequirement, ship]);

  const onLaunch = useCallback(() => {
    undockShip(!powered);
  }, [powered, undockShip]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (lastStatus.current && stage !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = stage;
  }, [stage]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <LaunchShipIcon />,
          label: `${isForceLaunch ? 'Force ' : ''}Launch Ship`,
          status: stage === actionStages.NOT_STARTED ? 'Send to Orbit' : undefined,
        }}
        captain={captain}
        location={{ asteroid, lot: originLot, ship }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? (isForceLaunch ? theme.colors.red : theme.colors.main) : undefined}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Launch' },
            { icon: <ShipIcon />, label: 'Ship' },
          ]}
        />

        {tab === 0 && (
          <>
            <FlexSection>
              <LotInputBlock
                title="Origin"
                lot={originLot}
                disabled={stage !== actionStages.NOT_STARTED}
              />

              <FlexSectionSpacer />

              <FlexSectionInputBlock
                title="Destination"
                image={<AsteroidImage asteroid={asteroid} />}
                label={formatters.asteroidName(asteroid)}
                sublabel="Orbit"
              />
            </FlexSection>

            {isForceLaunch ? null : (
              <>
                <FlexSection style={{ marginBottom: -15 }}>
                  <PropulsionTypeSection
                    objectLabel="Launch"
                    onSetPowered={(x) => setPowered(x)}
                    powered={powered}
                    propulsiveTime={poweredTime}
                    tugTime={tugTime} />

                  <FlexSectionSpacer />

                  <PropellantSection
                    title="Propellant"
                    deltaVLoaded={deltaVLoaded}
                    deltaVRequired={powered ? escapeVelocity : 0}
                    propellantLoaded={propellantLoaded}
                    propellantRequired={powered ? propellantRequirement : 0}
                    narrow
                  />
                </FlexSection>

                {/* TODO: only need "port traffic" bar if launching from spaceport AND there is > 0 traffic (see also: landing) */}
                {stage === actionStages.NOT_STARTED && (
                  <>
                    <ProgressBarSection
                      overrides={{
                        barColor: theme.colors.lightOrange,
                        color: theme.colors.lightOrange,
                        left: <><WarningOutlineIcon /> Launch Delay</>,
                        right: formatTimer(0) // TODO: ...
                      }}
                      stage={stage}
                      title="Port Traffic"
                    />
                    <ProgressBarNote themeColor="lightOrange">
                      {/* TODO: ... */}
                      <b>0 ships</b> are queued to launch ahead of you.
                    </ProgressBarNote>
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <ShipTab
            pilotCrew={flightCrew}
            deltas={{
              propellantMass: powered ? -propellantRequirement : 0,
              propellantVolume: powered ? -(propellantRequirement * propellantProduct.volumePerUnit / propellantProduct.massPerUnit) : 0,
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
        disabled={isDeliveryPending || (powered && propellantRequirement > propellantLoaded)}
        goLabel="Launch"
        onGo={onLaunch}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { data: ship, isLoading: shipIsLoading } = useShip(props.shipId);
  const dockingManager = useShipDockingManager(props.shipId);
  const { actionStage, currentUndockingAction } = dockingManager;

  const { data: shipCrews, isLoading: shipCrewsLoading } = useStationedCrews(ship, true);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(currentUndockingAction?.meta?.asteroidId || ship?._location?.asteroidId);
  const { data: originLot, isLoading: originLotIsLoading } = useLot(currentUndockingAction?.meta?.lotId || ship?._location?.lotId);

  const isLoading = shipIsLoading || asteroidIsLoading || originLotIsLoading || shipCrewsLoading;

  useEffect(() => {
    if (!asteroid || !originLot || !ship) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, originLot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage="Travel"
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <LaunchShip
        asteroid={asteroid}
        manager={dockingManager}
        originLot={originLot}
        ship={ship}
        shipCrews={shipCrews}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
