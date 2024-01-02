import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crewmate, Inventory, Lot, Product, Ship, Time } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { LaunchShipIcon, RouteIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { reactBool, formatFixed, formatTimer, locationsArrToObj, getCrewAbilityBonuses } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  BuildingImage,
  ProgressBarSection,
  AsteroidImage,
  ProgressBarNote,
  PropellantSection,
  ShipTab,
  PropulsionTypeSection,
  LotInputBlock,
  formatResourceMass,
  formatMass
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import formatters from '~/lib/formatters';
import useShip from '~/hooks/useShip';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';
import useAsteroid from '~/hooks/useAsteroid';
import useEntity from '~/hooks/useEntity';
import { getBonusDirection } from './components';
import { TimeBonusTooltip } from './components';

const LaunchShip = ({ asteroid, originLot, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { currentUndockingAction, undockShip } = manager;
  const { crew } = useCrewContext();

  // TODO: should this default to hopper-assisted if no propellant?
  const [powered, setPowered] = useState(true);
  const [tab, setTab] = useState(0);

  const crewmates = currentUndockingAction?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];

  const [hopperBonus, propellantBonus] = useMemo(() => {
    if (!crew) return {};
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, Crewmate.ABILITY_IDS.PROPELLANT_FLOW_RATE];
    const abilities = getCrewAbilityBonuses(bonusIds, crew) || {};
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);
  
  const [escapeVelocity, propellantRequirement, poweredTime, tugTime] = useMemo(() => {
    if (!ship || !asteroid) return [0, 0, 0, 0];
    const escapeVelocity = Asteroid.Entity.getEscapeVelocity(asteroid) * 1000;
    const propellantRequired = Ship.Entity.getPropellantRequirement(ship, escapeVelocity, hopperBonus.totalBonus);
    const originLotIndex = Lot.toIndex(originLot?.id);
    return [
      escapeVelocity,
      propellantRequired,
      0, // TODO: propellantBonus may be incorporated here in the future
      Time.toRealDuration(Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, 0, hopperBonus.totalBonus), crew?._timeAcceleration)
    ];
  }, [asteroid, hopperBonus, originLot?.id, powered, ship]);

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
      direction: powered && propellantRequirement > 0 ? getBonusDirection(hopperBonus) : 0
    },
    {
      label: 'Escape Velocity',
      value: `${formatFixed(escapeVelocity, 1)} km/s`,
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
  ]), [escapeVelocity, hopperBonus, launchTime, propellantRequirement, ship]);

  const onLaunch = useCallback(() => {
    undockShip();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (lastStatus.current && stage !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = stage;
  }, [stage]);

  const propellantProduct = Product.TYPES[Product.IDS.HYDROGEN_PROPELLANT];

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <LaunchShipIcon />,
          label: 'Launch Ship',
          status: stage === actionStages.NOT_STARTED ? 'Send to Orbit' : undefined,
        }}
        captain={captain}
        location={{ asteroid, lot: originLot, ship }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.main : undefined}
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

        {tab === 1 && (
          <ShipTab
            pilotCrew={{ ...crew, roster: crewmates }}
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

      {/* TODO: add waitForCrewReady? */}
      <ActionDialogFooter
        disabled={false/* TODO: insufficient propellant + reserved inventory, etc */}
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

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(currentUndockingAction?.meta?.asteroidId || ship?._location?.asteroidId);
  const { data: originLot, isLoading: originLotIsLoading } = useLot(currentUndockingAction?.meta?.lotId || ship?._location?.lotId);

  const isLoading = shipIsLoading || asteroidIsLoading || originLotIsLoading;

  useEffect(() => {
    if (!asteroid || !originLot || !ship) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, originLot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <LaunchShip
        asteroid={asteroid}
        manager={dockingManager}
        originLot={originLot}
        ship={ship}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
