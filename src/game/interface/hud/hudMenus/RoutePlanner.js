import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Entity, Inventory, Ship, Time } from '@influenceth/sdk';

import Dropdown from '~/components/Dropdown';
import { CloseIcon, WarningIcon } from '~/components/Icons';
import NumberInput from '~/components/NumberInput';
import Porkchop from '~/components/Porkchop';
import SliderInput from '~/components/SliderInput';
import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import { sampleAsteroidOrbit } from '~/lib/geometryUtils';
import { reactBool, formatFixed } from '~/lib/utils';
import { ShipImage, formatMass } from '../actionDialogs/components';
import { Scrollable } from './components';
import useCrewContext from '~/hooks/useCrewContext';

const ShipSelection = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin: 10px 0;
  & > div:first-child {
    height: 80px;
    margin-right: 8px;
    width: 125px;
  }
  & button {
    ${p => p.isSimulated && `color: ${p.theme.colors.main};`}
    margin-bottom: 10px;
  }
`;

const Sliders = styled.div``;
const SliderInfoRow = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  label {
    color: #888;
    flex: 1;
    font-size: 14px;
    b {
      color: ${p => p.theme.colors.main};
      font-weight: normal;
    }
  }
  input {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.5);
    transition: border-color 250ms ease;
    width: 85px;
    &:hover {
      border-color: ${p => p.theme.colors.main};
    }
  }
  sub {
    font-size: 12px;
    opacity: 0.75;
    margin-left: 3px;
  }
`;
const SliderSection = styled.div``;

const SectionHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid #333;
  color: #777;
  display: flex;
  font-size: 13px;
  height: 22px;
  margin-bottom: 4px;
  text-transform: uppercase;
  & > span:first-child {
    flex: 1;
  }
`;
const SectionBody = styled.div`
  padding-left: 12px;
`;

const InfoRow = styled.div`
  align-items: center;
  border-bottom: 1px solid #222;
  display: flex;
  flex-direction: row;
  height: 32px;
  line-height: 0;
  label {
    font-size: 90%;
    text-transform: uppercase;
  }
`;

const Note = styled.span`
  color: ${p => p.isError ? p.theme.colors.error : p.theme.colors.main};
  flex: 1;
  font-size: 80%;
  font-weight: bold;
  padding-right: 10px;
  text-align: right;
`;

const Value = styled.span`
  text-align: right;
  min-width: 90px;
`;

const Closer = styled.span`
  color: ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  opacity: 0.5;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 1;
  }
`;

const resolution = 1;
const minDelay = 0.1;
const maxDelay = minDelay + 365;
const minTof = Math.max(resolution, 1);
const maxTof = minTof + 365;

// contents: [{ type: InventoryItem }],
//     entity: { type: Entity },
//     inventoryType: { type: Number },
//     mass: { type: Number },
//     slot: { type: Number },
//     status: { type: Number },
//     reservedMass: { type: Number },
//     reservedVolume: { type: Number },
//     volume: { type: Number }

const simInventoryDefaults = { contents: [], mass: 0, volume: 0, reservedMass: 0, reservedVolume: 0, status: Inventory.STATUSES.AVAILABLE };

const getInventoriesByShipType = (shipType) => {
  const inventories = [];
  const config = Ship.TYPES[shipType];

  if (config.cargoSlot) {
    inventories.push({
      ...simInventoryDefaults,
      slot: config.cargoSlot,
      inventoryType: config.cargoInventoryType
    });
  }

  if (config.propellantSlot) {
    inventories.push({
      ...simInventoryDefaults,
      slot: config.propellantSlot,
      inventoryType: config.propellantInventoryType
    });
  }

  return inventories;
};

const RoutePlanner = () => {
  const { coarseTime } = useContext(ClockContext);
  const { crew } = useCrewContext();

  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const dispatchTravelSolution = useStore(s => s.dispatchTravelSolution);
  const timeOverride = useStore(s => s.timeOverride);
  const travelSolution = useStore(s => s.asteroids.travelSolution);

  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const { data: myShips, isLoading: myShipsLoading } = { data: [] }; // TODO: useMyShips

  const [baseTime, setBaseTime] = useState();
  const [nowTime, setNowTime] = useState();

  const [cargoMass, setCargoMass] = useState(0);
  const [propellantMass, setPropellantMass] = useState(0);
  const [ship, setShip] = useState();

  const shipList = useMemo(() => {
    if (myShipsLoading) return [];
    return [
      // add my ships
      ...myShips.sort((a, b) => {
        if (crew?._location?.shipId === a.id) return -1;
        if (crew?._location?.shipId === b.id) return 1;

        const aLoc = a.Location.location;
        const bLoc = b.Location.location;

        if (aLoc.label === Entity.IDS.ASTEROID && aLoc.id === originId) return -1;
        if (bLoc.label === Entity.IDS.ASTEROID && bLoc.id === originId) return 1;

        if (aLoc.id === originId) return -1;
        if (bLoc.id === originId) return 1;

        return 0;
      }),

      // add simulations
      ...Object.keys(Ship.TYPES).map((s, i) => ({
        label: Entity.IDS.SHIP,
        id: -(1 + i),
        i: -(1 + i),
        Name: { name: `[Simulated] ${Ship.TYPES[s].name}` },
        Ship: { shipType: Number(s), status: Ship.STATUSES.AVAILABLE },
        Location: { location: { label: Entity.IDS.ASTEROID, id: originId } },
        Inventories: getInventoriesByShipType(s),
        _simulated: true
      }))
    ].map((s) => ({
      ...s,
      _name: s.Name?.name || `Ship #${s.id.toLowerCase()}`,
    }))
  }, [myShips, myShipsLoading, crew?._location?.shipId, originId]);

  // select default
  useEffect(() => {
    if (shipList.length > 0 && !ship) {
      setShip(shipList[0]);
    }
  }, [shipList, ship]);

  const shipConfig = useMemo(() => {
    if (!ship) return null;

    const shipTypeConfig = Ship.TYPES[ship.Ship.shipType];
    const cargoInventory = ship.Inventories.find((i) => i.slot === shipTypeConfig.cargoSlot);
    const propellantInventory = ship.Inventories.find((i) => i.slot === shipTypeConfig.propellantSlot);

    const config = {};
    config.maxCargoMass = Inventory.TYPES[cargoInventory?.inventoryType]?.massConstraint || 0;
    config.maxPropellantMass = Inventory.TYPES[propellantInventory?.inventoryType]?.massConstraint || 0;

    if (ship._simulated) {
      config.initialCargoMass = config.maxCargoMass * 0.5;
      config.initialPropellantMass = config.maxPropellantMass * 0.5;
    } else {
      config.initialCargoMass = cargoInventory?.mass || 0;
      config.initialPropellantMass = propellantInventory?.mass || 0;
    }

    return config;
  }, [ship]);

  useEffect(() => {
    if (!shipConfig) return;
    setCargoMass(shipConfig.initialCargoMass);
    setPropellantMass(shipConfig.initialPropellantMass);
  }, [shipConfig]);

  const onSetCargoMass = useCallback((amount) => {
    const parsed = parseInt(amount * 1_000_000) || 0;
    setCargoMass(Math.max(0, Math.min(shipConfig?.maxCargoMass, Math.floor(parsed))));
  }, [shipConfig]);

  const onSetPropellantMass = useCallback((amount) => {
    const parsed = parseInt(amount * 1_000_000) || 0;
    setPropellantMass(Math.max(0, Math.min(shipConfig?.maxPropellantMass, Math.floor(parsed))));
  }, [shipConfig]);

  const shipParams = useMemo(() => {
    if (!ship) return 0;
    const exhaustVelocity = Ship.TYPES[ship.Ship.shipType]?.exhaustVelocity || 0;
    const hullMass = Ship.TYPES[ship.Ship.shipType]?.hullMass || 0;

    return {
      ...ship,
      actualCargoMass: cargoMass,
      actualPropellantMass: propellantMass,
      exhaustVelocity,
      hullMass,
      maxDeltaV: exhaustVelocity * Math.log((hullMass + cargoMass + propellantMass) / (hullMass + cargoMass))
    };
  }, [ship, cargoMass, propellantMass]);

  useEffect(() => {
    dispatchReorientCamera(true);

    return () => {
      dispatchReorientCamera(true);
    }
  }, [dispatchReorientCamera]);

  useEffect(() => {
    if (!nowTime || !timeOverride?.speed || Math.abs(timeOverride.speed) <= 1) {
      setNowTime(coarseTime);

      if (!baseTime || !travelSolution || travelSolution?.departureTime < coarseTime) {
        setBaseTime(coarseTime);
      }
    }
  }, [coarseTime, timeOverride?.speed, nowTime, baseTime, travelSolution]);

  const { originPath, destinationPath } = useMemo(() => {
    if (!origin || !destination || !baseTime) return {};
    // TODO: could do each of these in a worker as well
    //  (might as well move to porkchop at that point)
    const p1 = performance.now();
    const paths = {
      originPath: sampleAsteroidOrbit(
        baseTime,
        origin.Orbit,
        minDelay,
        maxDelay,
        resolution
      ),
      destinationPath: sampleAsteroidOrbit(
        baseTime,
        destination.Orbit,
        minDelay + minTof,
        maxDelay + maxTof,
        resolution
      )
    };

    console.log('time to sample trajectories', performance.now() - p1);
    return paths;
  }, [baseTime, origin, destination]);

  // hasTray is true if real ship selected and valid solution is selected
  const hasTray = false;

  return (
    <Scrollable hasTray={hasTray} style={{ marginLeft: -12, paddingLeft: 12 }}>

      <ShipSelection isSimulated={ship?._simulated}>
        <ShipImage shipType={ship?.id} simulated={reactBool(ship?._simulated)} />

        <div>
          <SectionHeader style={{ border: 0, margin: 0 }}>Ship</SectionHeader>
          <Dropdown
            labelKey="_name"
            onChange={setShip}
            options={shipList}
            valueKey="i"
            size="small"
            style={{ textTransform: 'none' }}
            width={200} />
        </div>

      </ShipSelection>

      <Sliders>
        <SliderSection>
          <SliderInfoRow>
            <label><b>Simulated</b> Onboard Cargo</label>
            <NumberInput
              min={0}
              max={shipConfig?.maxCargoMass / 1_000_000 || 0}
              onChange={onSetCargoMass}
              step={0.1}
              value={cargoMass / 1_000_000} />
            <sub>t</sub>
          </SliderInfoRow>
          <SliderInput
            min={0}
            max={shipConfig?.maxCargoMass / 1_000_000 || 0}
            increment={0.1}
            onChange={onSetCargoMass}
            value={cargoMass / 1_000_000 || 0} />
        </SliderSection>

        <SliderSection>
          <SliderInfoRow>
            <label><b>Simulated</b> Onboard Propellant</label>
            <NumberInput
              min={0}
              max={shipConfig?.maxPropellantMass / 1_000_000 || 0}
              onChange={onSetPropellantMass}
              step={0.1}
              value={propellantMass / 1_000_000} />
            <sub>t</sub>
          </SliderInfoRow>
          <SliderInput
            min={0}
            max={shipConfig?.maxPropellantMass / 1_000_000 || 0}
            increment={0.1}
            onChange={onSetPropellantMass}
            value={propellantMass / 1_000_000 || 0} />
        </SliderSection>
      </Sliders>

      <SectionHeader style={{ marginBottom: 10 }}>
        <span>Ballistic Transfer Graph</span>
        {travelSolution && (
          <Closer onClick={dispatchTravelSolution}><CloseIcon /></Closer>
        )}
      </SectionHeader>
      <SectionBody>
        {shipParams && originPath && destinationPath && (
          <Porkchop
            originId={originId}
            destinationId={destinationId}
            baseTime={baseTime}
            nowTime={nowTime}
            originPath={originPath}
            destinationPath={destinationPath}
            minDelay={minDelay}
            maxDelay={maxDelay}
            minTof={minTof}
            maxTof={maxTof}
            shipParams={shipParams}
            size={320}
          />
        )}
      </SectionBody>

      {travelSolution && (
        <>
          <SectionHeader>Route Details</SectionHeader>
          <SectionBody style={{ paddingBottom: 20 }}>
            <InfoRow>
              <label>Depart</label>
              <Note>{travelSolution.departureTime > coarseTime ? '+' : ''}{formatFixed(travelSolution.departureTime - coarseTime, 1)}h</Note>
              <Value>
                {Time.fromOrbitADays(travelSolution.departureTime).toGameClockADays(true)}
              </Value>
            </InfoRow>

            <InfoRow>
              <label>Arrive</label>
              <Note>{travelSolution.arrivalTime > coarseTime ? '+' : ''}{formatFixed(travelSolution.arrivalTime - coarseTime, 1)}h</Note>
              <Value>
                {Time.fromOrbitADays(travelSolution.arrivalTime).toGameClockADays(true)}
              </Value>
            </InfoRow>

            <InfoRow>
              <label>Propellant</label>
              <Note isError={travelSolution.usedPropellantPercent > 100}>
                {travelSolution.usedPropellantPercent > 1000
                  ? <WarningIcon />
                  : `${formatFixed(travelSolution.usedPropellantPercent, 1)}%`
                }
              </Note>
              <Value>
                {formatMass(travelSolution.usedPropellantMass, { minPrecision: 4 })}
              </Value>
            </InfoRow>
          </SectionBody>
        </>
      )}
    </Scrollable>
  );
};

export default RoutePlanner;
