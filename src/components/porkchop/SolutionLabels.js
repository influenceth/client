import { useContext, useMemo } from 'react';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';
import useStore from '~/hooks/useStore';

const tagHeight = 24;
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
  font-size: 90%;
  font-weight: bold;
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
      margin-top: -34px;
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
  ${Label} {
    align-items: center;
    display: flex;
    height: 24px;
    padding: 0 6px;
  }
  &:first-child {
    margin-bottom: 4px;
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
  ${p => p.x > 0.5 ? 'left' : 'right'}: 12px;
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
      const color = p.colorValue > 1
        ? p.theme.colors.error
        : (
          p.colorValue > 0.5
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
      right: ${100 * (1 - p.x)}%;
      margin-right: -35px;
    `
  }
  & > label {
    padding: 0 5px;
  }

  ${Tag} {
    height: 26px;
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

const SolutionLabels = ({ center, maxDeltaV, mousePos }) => {
  const { coarseTime } = useContext(ClockContext);
  const travelSolution = useStore(s => s.asteroids.travelSolution);

  const {
    arrival,
    delay,
    deltaV,
    invalid,
    tof
  } = useMemo(() => {
    return {
      arrival: Math.round(travelSolution.arrivalTime - coarseTime),
      delay: Math.round(travelSolution.departureTime - coarseTime),
      deltaV: Math.round(1000 * travelSolution.deltaV / maxDeltaV) / 10,
      invalid: travelSolution.deltaV > maxDeltaV,
      tof: (travelSolution.arrivalTime - travelSolution.departureTime),
    }
  });

  return (
    <>
      <FlightTimeLabel x={center.x} y={center.y} mousePos={mousePos}>
        <Label>Flight Time</Label>
        <Tag invalid={invalid}><label>{tof}h</label></Tag>
      </FlightTimeLabel>

      <CornerLabels x={center.x} y={center.y} mousePos={mousePos}>
        <Row>
          <Label>Propellant Burned</Label>
          <StatValue colorValue={travelSolution.deltaV / maxDeltaV}>{deltaV}%</StatValue>
        </Row>
        {!invalid && (
          <Row>
            <ArrivalLabel>Arrival In</ArrivalLabel>
            <StatValue>{arrival}h</StatValue>
          </Row>
        )}
      </CornerLabels>

      <DelayLabel x={center.x}>
        <Label>Launch Delay</Label>
        <Tag invalid={invalid}><label>{delay}h</label></Tag>
      </DelayLabel>
    </>
  );
};

export default SolutionLabels;