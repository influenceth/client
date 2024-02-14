import { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Crew, Time } from '@influenceth/sdk';

import { CrewBusyIcon, CrewIdleIcon } from '~/components/AnimatedIcons';
import useChainTime from '~/hooks/useChainTime';
import useConstants from '~/hooks/useConstants';
import { hexToRGB } from '~/theme';
import useBlockTime from '~/hooks/useBlockTime';
import LiveTimer from './LiveTimer';


const opacityKeyframes = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

const IconWrapper = styled.span``;

const StatusContainer = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  line-height: 0;
  justify-content: flex-end;
  & > label {
    color: #BBB;
    padding-left: 6px;
    text-transform: uppercase;
  }
  & > ${IconWrapper} {
    align-items: center;
    // background: rgba(90, 90, 90, 0.75);
    border-radius: 3px;
    display: flex;
    justify-content: center;
    font-size: 24px;
    margin-left: 4px;
    height: 24px;
    width: 24px;
  }
`;
const BusyStatusContainer = styled(StatusContainer)`
  & > label {
    color: ${p => p.theme.colors.main};
  }
  & > ${IconWrapper} {
    color: ${p => p.theme.colors.main};
    & > svg {
      animation: ${opacityKeyframes} 2000ms infinite;
    }
  }
`;

const TimerWrapper = styled.span.attrs((p) => {
  let width = 0;
  if (p.len === 7) width = 66;
  if (p.len === 6) width = 61;
  if (p.len === 5) width = 56;
  if (p.len === 4) width = 51;
  if (p.len === 3) width = 46;
  if (p.len === 2) width = 41;
  return width ? { style: { width: `${width}px` } } : {};
})`
  display: inline-block;
  padding-left: 5px;
  text-align: right;
  white-space: nowrap;
  ${p => p.waitingOnBlock && `
    opacity: 0.5;
    font-size: 13px;
  `}
`;


const LiveReadyStatus = ({ crew, ...props }) => {
  const blockTime = useBlockTime();

  const [crewIsBusy, setCrewIsBusy] = useState(false);
  const [waitingOnBlock, setWaitingOnBlock] = useState(false);
  useEffect(() => {
    const readyAtMS = (crew?.Crew?.readyAt || 0) * 1e3;
    if (readyAtMS > Date.now()) {
      setCrewIsBusy(true);
      const to = setTimeout(() => {
        setCrewIsBusy(false);
      }, 1000 + (readyAtMS - Date.now()))
      return () => { if (to) { clearTimeout(to) } };
    } else {
      setCrewIsBusy(false);
    }
  }, [crew?.Crew?.readyAt]);

  useEffect(() => {
    setWaitingOnBlock(blockTime < (crew?.Crew?.readyAt || 0));
  }, [blockTime, crew?.Crew?.readyAt])

  if (!crew || !blockTime) return null;
  return crewIsBusy || waitingOnBlock
    ? (
      <BusyStatusContainer {...props}>
        <LiveTimer target={crew.Crew.readyAt} maxPrecision={2}>
          {(formattedTime) => <TimerWrapper len={formattedTime.length} waitingOnBlock={!crewIsBusy}>{formattedTime}</TimerWrapper>}
        </LiveTimer>
        {crewIsBusy && <label>Busy</label>}
        <IconWrapper><CrewBusyIcon /></IconWrapper>
      </BusyStatusContainer>
    )
    : (
      <StatusContainer {...props}>
        <label>Idle</label> 
        <IconWrapper><CrewIdleIcon /></IconWrapper>
      </StatusContainer>
    );
}

export default LiveReadyStatus;