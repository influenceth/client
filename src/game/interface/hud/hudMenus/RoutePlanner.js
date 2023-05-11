import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import Dropdown from '~/components/DropdownV2';
import { CloseIcon } from '~/components/Icons';
import NumberInput from '~/components/NumberInput';
import Porkchop from '~/components/Porkchop';
import SliderInput from '~/components/SliderInput';
import ClockContext from '~/contexts/ClockContext';
import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import { sampleAsteroidOrbit } from '~/lib/geometryUtils';
import { orbitTimeToGameTime } from '~/lib/utils';
import { BuildingImage } from '../actionDialogs/components';
import { Scrollable } from './components';

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
    opacity: 0.4;
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

const Value = styled.span`
  flex: 1;
  text-align: right;
  ${p => p.note && `
    &:before {
      content: "${p.note}";
      color: ${p.theme.colors.main};
      font-size: 80%;
      font-weight: bold;
      margin-right: 8px;
    }
  `}
`;

const Closer = styled.span`
  color: ${p => p.theme.colors.red};
  cursor: ${p => p.theme.cursors.active};
  opacity: 0.5;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 1;
  }
`;

const resolution = 1;
const minDelay = 0;
const maxDelay = 365;
const minTof = Math.max(resolution, 1);
const maxTof = minTof + 365;

const exhaustVelocity = 29000; // m/s
// masses are in tons
// maxThrust is in N (kg m / s^2)
const ships = [
  {
    i: 0,
    label: 'Shuttle',
    emptyMass: 100e3,
    maxPropellantMass: 950e3,
    maxCargoMass: 10e3,
    engines: 1,
    maxThrust: 612916,
    isSimulated: true
  },
  {
    i: 1,
    label: 'Light Transport',
    emptyMass: 180e3,
    maxPropellantMass: 1805e3,
    maxCargoMass: 2000e3,
    engines: 2,
    maxThrust: 1225831,
    isSimulated: true
  },
  {
    i: 2,
    label: 'Heavy Transport',
    emptyMass: 1010e3,
    maxPropellantMass: 11875e3,
    maxCargoMass: 12000e3,
    engines: 9,
    maxThrust: 5516241,
    isSimulated: true
  }
];

const RoutePlanner = () => {
  const { coarseTime } = useContext(ClockContext);
  const buildings = useBuildingAssets();
  
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const dispatchTravelSolution = useStore(s => s.dispatchTravelSolution);
  const timeOverride = useStore(s => s.timeOverride);
  const travelSolution = useStore(s => s.asteroids.travelSolution);

  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);

  const [baseTime, setBaseTime] = useState();

  const [cargoMass, setCargoMass] = useState(0);
  const [propellantMass, setPropellantMass] = useState(0);
  const [ship, setShip] = useState(ships[0]);

  const onSetCargoMass = useCallback((amount) => {
    setCargoMass(Math.max(0, Math.min(ship?.maxCargoMass, Math.floor(parseInt(amount) || 0))));
  }, [ship]);
  
  const onSetPropellantMass = useCallback((amount) => {
    setPropellantMass(Math.max(0, Math.min(ship?.maxPropellantMass, Math.floor(parseInt(amount) || 0))));
  }, [ship]);

  const onCancel = useCallback(() => {
    dispatchTravelSolution();
  }, []);

  const shipParams = useMemo(() => {
    if (!ship) return 0;
    
    return {
      ...ship,
      actualCargoMass: cargoMass,
      actualPropellantMass: propellantMass,
      exhaustVelocity,
      maxDeltaV: exhaustVelocity * Math.log((ship.emptyMass + cargoMass + propellantMass) / (ship.emptyMass + cargoMass))
    };
  }, [ship, cargoMass, propellantMass]);

  useEffect(() => {
    if (!ship) return;
    onSetCargoMass(ship.maxCargoMass * 0.5);
    setPropellantMass(ship.maxPropellantMass * 0.5);
  }, [ship]);

  useEffect(() => {
    dispatchReorientCamera(true);
    return () => {
      dispatchReorientCamera(true);
    }
  }, []);

  useEffect(() => {
    if (!baseTime || Math.abs(timeOverride?.speed) <= 1) {
      setBaseTime(coarseTime);
    }
  }, [coarseTime]);

  const { originPath, destinationPath } = useMemo(() => {
    if (!origin || !destination || !baseTime) return {};
    // TODO: could do each of these in a worker as well
    //  (might as well move to porkchop at that point)
    const p1 = performance.now();
    const paths = {
      originPath: sampleAsteroidOrbit(
        baseTime,
        origin.orbital,
        minDelay,
        maxDelay,
        resolution
      ),
      destinationPath: sampleAsteroidOrbit(
        baseTime,
        destination.orbital,
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

      <ShipSelection isSimulated={ship?.isSimulated}>
        <BuildingImage
          building={buildings[1]}
          unfinished
        />

        <div>
          <SectionHeader style={{ border: 0, margin: 0 }}>Ship</SectionHeader>
          <Dropdown
            labelKey="label"
            onChange={setShip}
            options={ships}
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
              max={ship?.maxCargoMass || 0}
              onChange={onSetCargoMass}
              step={1}
              value={cargoMass} />
            <sub>kg</sub>
          </SliderInfoRow>
          <SliderInput
            min={0}
            max={ship?.maxCargoMass || 0}
            increment={1}
            onChange={onSetCargoMass}
            value={cargoMass || 0} />
        </SliderSection>

        <SliderSection>
          <SliderInfoRow>
            <label><b>Simulated</b> Onboard Propellant</label>
            <NumberInput
              min={0}
              max={ship?.maxPropellantMass || 0}
              onChange={onSetPropellantMass}
              step={1}
              value={propellantMass} />
            <sub>kg</sub>
          </SliderInfoRow>
          <SliderInput
            min={0}
            max={ship?.maxPropellantMass || 0}
            increment={1}
            onChange={onSetPropellantMass}
            value={propellantMass || 0} />
        </SliderSection>
      </Sliders>

      <SectionHeader style={{ marginBottom: 10 }}>
        <span>Ballistic Transfer Graph</span>
        {travelSolution && (
          <Closer onClick={onCancel}><CloseIcon /></Closer>
        )}
      </SectionHeader>
      <SectionBody>
        {shipParams && originPath && destinationPath && (
          <Porkchop
            baseTime={baseTime}
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
              <Value>
                {orbitTimeToGameTime(travelSolution.departureTime).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Value>
            </InfoRow>

            <InfoRow>
              <label>Arrive</label>
              <Value note={`${Math.round(travelSolution.arrivalTime - coarseTime)}h from now`}>
                {orbitTimeToGameTime(travelSolution.arrivalTime).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Value>
            </InfoRow>
          </SectionBody>
        </>
      )}
    </Scrollable>
  );
};

export default RoutePlanner;
