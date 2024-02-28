import { useContext, useMemo } from 'react';
import styled from 'styled-components';
import { Crew, Inventory, Ship, Time } from '@influenceth/sdk';

import ClockContext from '~/contexts/ClockContext';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import { WarningIcon } from '../Icons';
import { formatFixed } from '~/lib/utils';
import useConstants from '~/hooks/useConstants';

const tagHeight = 22;
const halfTagHeight = tagHeight / 2;

const tagClipPath = (flip, height) => {
  const halfHeight = height / 2;
  return flip
    ? `
      polygon(
        ${halfHeight}px 0,
        100% 0,
        100% 100%,
        ${halfHeight}px 100%,
        0 ${halfHeight}px
      )
    `
    : `
      polygon(
        0 0,
        calc(100% - ${halfHeight}px) 0,
        100% ${halfHeight}px,
        calc(100% - ${halfHeight}px) 100%,
        0 100%
      )
    `
  ;
}

const TopLevelLabel = styled.div`
  font-size: 14px;
  opacity: 1;
  pointer-events: none;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 0;
  }
`;

const Label = styled.label`
  background: rgba(0, 0, 0, 0.6);
  color: ${p => p.theme.colors.main};
  font-size: 100%;
  font-weight: bold;
  white-space: nowrap;
`;

const Tag = styled.div`
  background: ${p => p.invalid ? p.theme.colors.error : p.theme.colors.main};
  height: ${tagHeight}px;
  padding: 1px;
  width: 90px;
  & > label {
    align-items: center;
    background: black;
    color: ${p => p.invalid ? p.theme.colors.error : 'white'};
    display: flex;
    font-weight: bold;
    height: ${tagHeight - 2}px;
    justify-content: center;
  };
`;

const FlightTimeLabel = styled(TopLevelLabel).attrs((p) => {
  if (p.mousePos) {
    if ((p.mousePos.x < 0.5) !== (p.x < 0.5)) {
      if (Math.abs(p.mousePos.y - p.y) < 0.2) {
        return { style: { opacity: 0 } };
      }
    }
  }
  return {};
})`
  display: flex;
  position: absolute;
  top: ${p => 100 * p.y}%;
  z-index: 2;
  & > ${Label} {
    display: inline-block;
    padding: 3px 5px;
  }

  ${p => p.y > 0.5
    ? `
      flex-direction: column;
      margin-top: -32px;
      & > ${Label} { margin-bottom: -1px; }
    `
    : `
      flex-direction: column-reverse;
      margin-top: -${halfTagHeight - 1}px;
      & > ${Label} { margin-top: -1px; }
    `
  }
  ${p => p.x > 0.5
    ? `
      align-items: flex-start;
      left: 6px;
      & > ${Label} {
        margin-left: ${halfTagHeight}px;
      }
      ${Tag} {
        clip-path: ${tagClipPath(true, tagHeight)};
        & > label {
          clip-path: ${tagClipPath(true, tagHeight - 2)};
          padding-left: ${tagHeight / 2}px;
        }
      }
    `
    : `
      align-items: flex-end;
      right: 6px;
      & > ${Label} {
        margin-right: ${halfTagHeight}px;
      }
      ${Tag} {
        clip-path: ${tagClipPath(false, tagHeight)};
        & > label {
          clip-path: ${tagClipPath(false, tagHeight - 2)};
          padding-right: ${tagHeight / 2}px;
        }
      }
    `
  }
`;

const Row = styled.div`
  align-items: center;
  display: inline-flex;
  flex-direction: row;
  font-weight: bold;
  margin-bottom: 4px;
  &:last-child {
    margin-bottom: 0;
  }
  ${Label} {
    align-items: center;
    display: flex;
    height: ${tagHeight}px;
    padding: 0 6px;
  }
`;
const CornerLabels = styled(TopLevelLabel).attrs((p) => {
  if (p.mousePos) {
    if (((p.mousePos.x < 0.5) !== (p.x < 0.5)) || p.mousePos.y < 0.24 || p.mousePos.y > 0.76) {
      if ((p.mousePos.y < 0.5) !== (p.y < 0.5)) {
        return { style: { opacity: 0 } };
      }
    }
  }
  return {};
})`
  display: flex;
  flex-direction: column;
  position: absolute;
  ${p => p.x > 0.5 ? 'left' : 'right'}: 6px;
  align-items: ${p => p.x > 0.5 ? 'flex-start' : 'flex-end'};
  ${p => p.y > 0.5 ? 'top' : 'bottom'}: 6px;
  z-index: 2;
`;
const ArrivalLabel = styled(Label)`
  &:before {
    content: '';
    border-bottom: 1px dashed rgba(255, 255, 255, 0.5);
    display: inline-block;
    height: 0;
    margin-right: 6px;
    width: 20px;
  }
`;
const StatValue = styled.div`
  align-items: center;
  align-self: stretch;
  color: white;
  display: flex;
  background: black;
  border: 1px solid ${p => p.theme.colors.main};
  justify-content: center;
  width: 80px;
  ${p => {
    if (p.colorValue !== undefined) {
      const color = p.colorValue > 100
        ? p.theme.colors.error
        : (
          p.colorValue > 50
          ? p.theme.colors.orange
          : null
        );
      if (color) {
        return `
          border-color: ${color};
          color: ${color};
        `;
      }
    }
    return ``;
  }}
`;

const DelayLabel = styled(TopLevelLabel)`
  align-items: center;
  bottom: -30px;
  display: flex;
  position: absolute;
  ${p => p.x < 0.5
    ? `
      flex-direction: row-reverse;
      left: ${Math.max(7, 100 * p.x)}%;
      margin-left: -35px;
    `
    : `
      flex-direction: row;
      right: ${Math.max(5, 100 * (1 - p.x))}%;
      margin-right: -35px;
    `
  }
  & > label {
    padding: 0 5px;
  }

  ${Tag} {
    height: ${tagHeight + 4}px;
    margin-top: -5px;
    clip-path: polygon(
      0 5px,
      calc(50% - 5px) 5px,
      50% 0,
      calc(50% + 5px) 5px,
      100% 5px,
      100% 100%,
      0 100%
    );
    width: 72px;
    & > label {
      align-items: center;
      background: black;
      clip-path: polygon(
        0 5px,
        calc(50% - 5px) 5px,
        50% 0,
        calc(50% + 5px) 5px,
        100% 5px,
        100% 100%,
        0 100%
      );
      display: flex;
      height: 100%;
      justify-content: center;
      padding-top: 5px;
    }
  }
`;

const SolutionLabels = ({ center, emode, lastFedAt, mousePos, shipParams }) => {
  const { coarseTime } = useContext(ClockContext);
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');
  
  const { crew } = useCrewContext();
  const travelSolution = useStore(s => s.asteroids.travelSolution);

  const {
    arrival,
    delay,
    invalid: insufficientPropellant,
    usedPropellant,
    tof
  } = useMemo(() => {
    if (!travelSolution) return {};

    return {
      arrival: Math.round(Time.toRealDuration(24 * (travelSolution.arrivalTime - coarseTime), TIME_ACCELERATION)),
      delay: Math.round(Time.toRealDuration(24 * (travelSolution.departureTime - coarseTime), TIME_ACCELERATION)),
      tof: Math.round(Time.toRealDuration(24 * (travelSolution.arrivalTime - travelSolution.departureTime), TIME_ACCELERATION)),
      usedPropellant: Math.ceil(travelSolution.usedPropellantPercent),
      invalid: travelSolution.invalid,
    }
  }, [travelSolution]);

  const [currentFood, usedFood] = useMemo(() => {
    if (emode || !lastFedAt || !travelSolution?.arrivalTime) return [100, 100];
    const currentFood = Math.round(100 * Crew.getCurrentFoodRatio((coarseTime - lastFedAt) * 86400, crew?._foodBonuses?.consumption));
    
    const currentFoodIfMaxed = 100;
    const arrivalFoodIfMaxed = Math.round(100 * Crew.getCurrentFoodRatio((travelSolution?.arrivalTime - coarseTime) * 86400, crew?._foodBonuses?.consumption));
    return [
      currentFood,
      formatFixed(100 * (currentFoodIfMaxed - arrivalFoodIfMaxed) / currentFood, 1)
    ];
  }, [emode, travelSolution?.arrivalTime, coarseTime, crew?._foodBonuses?.consumption, lastFedAt]);

  // only report the >100% values if they are within the ship/crew's capabilities
  const [maxReportableFood, maxReportablePropellant] = useMemo(() => {
    if (!shipParams || !travelSolution) return [100, 100];
    const shipConfig = Ship.TYPES[shipParams.Ship.shipType];
    const propInv = shipParams.Inventories.find((i) => i.slot === shipConfig.propellantSlot);
    const invConfig = Inventory.getType(propInv.inventoryType, crew?._inventoryBonuses);
    return [
      Math.floor(100 * (100 / currentFood)),
      Math.floor(100 * (invConfig.massConstraint / shipParams.actualPropellantMass))
    ];
  }, [crew?._inventoryBonuses, currentFood, shipParams, travelSolution]);

  const invalid = insufficientPropellant || (!emode && usedFood >= 100);

  return (
    <>
      <FlightTimeLabel x={center.x} y={center.y} mousePos={mousePos}>
        <Label>Flight Time</Label>
        <Tag invalid={invalid}><label>{tof}h</label></Tag>
      </FlightTimeLabel>

      <CornerLabels x={center.x} y={center.y} mousePos={mousePos}>
        <Row>
          <Label>Propellant Used</Label>
          <StatValue colorValue={usedPropellant}>{usedPropellant >= maxReportablePropellant ? <WarningIcon /> : `${usedPropellant}%`}</StatValue>
        </Row>
        {!emode && (
          <Row>
            <Label>Food Used</Label>
            <StatValue colorValue={invalid ? 1000 : 0}>{usedFood >= maxReportableFood ? <WarningIcon /> : `${usedFood}%`}</StatValue>
          </Row>
        )}
        <Row>
          <ArrivalLabel>Arrival In</ArrivalLabel>
          <StatValue colorValue={invalid ? 1000 : 0}>{arrival}h</StatValue>
        </Row>
      </CornerLabels>

      <DelayLabel x={center.x}>
        <Label>Departure Delay</Label>
        <Tag invalid={invalid}><label>{delay}h</label></Tag>
      </DelayLabel>
    </>
  );
};

export default SolutionLabels;