import { useEffect, useMemo, useState } from '~/lib/react-debug';
import styled, { keyframes } from 'styled-components';

import { CrewBusyIcon, CrewIdleIcon, RandomEventIcon } from '~/components/AnimatedIcons';
import { ScheduleFullIcon, ShipIcon, TimerIcon } from '~/components/Icons';
import LiveTimer from '~/components/LiveTimer';
import useBlockTime from '~/hooks/useBlockTime';
import useConstants from '~/hooks/useConstants';
import useCrewContext from '~/hooks/useCrewContext';
import theme from '~/theme';


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
  flex-direction: ${p => p.flip ? 'row-reverse': 'row'};
  
  line-height: 0;
  justify-content: flex-end;
  & > label {
    color: #BBB;
    font-weight: bold;
    padding-left: 6px;
    text-transform: uppercase;
    white-space: nowrap;
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

export const TimerWrapper = styled.span.attrs((p) => {
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

const BusyStatusContainer = styled(StatusContainer)`
  & > label {
    color: ${p => p.color || p.theme.colors.main};
  }
  & > ${IconWrapper} {
    color: ${p => p.color || p.theme.colors.main};
    & > svg {
      animation: ${opacityKeyframes} 2000ms infinite;
    }
  }
  & > ${TimerWrapper} {
    ${p => p.flip && `
      text-align: left;
    `};
  }
`;

const LiveReadyStatus = ({ crew, ...props }) => {
  const { data: CREW_SCHEDULE_BUFFER } = useConstants('CREW_SCHEDULE_BUFFER');
  const blockTime = useBlockTime();
  const { isLaunched } = useCrewContext();

  const [crewIsBusy, setCrewIsBusy] = useState(false);
  const [waitingOnBlock, setWaitingOnBlock] = useState(false);
  useEffect(import.meta.url, () => {
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

  useEffect(import.meta.url, () => {
    setWaitingOnBlock(blockTime < (crew?.Crew?.readyAt || 0));
  }, [blockTime, crew?.Crew?.readyAt]);

  const scheduleEnd = useMemo(import.meta.url, () => blockTime + CREW_SCHEDULE_BUFFER, [blockTime, CREW_SCHEDULE_BUFFER]);

  if (!crew || !blockTime) return null;
  if (crew._actionTypeTriggered?.pendingEvent) {
    return (
      <StatusContainer {...props}>
        <label style={{ color: '#e6d375' }}>Event</label> 
        <IconWrapper><RandomEventIcon /></IconWrapper>
      </StatusContainer>
    );
  }
  if (crewIsBusy || waitingOnBlock) {
    return (
      <BusyStatusContainer {...props} color={crew._location?.asteroidId && crew.Crew?.readyAt < scheduleEnd ? '' : theme.colors.inFlight}>
        <LiveTimer target={crew.Crew.readyAt} maxPrecision={2}>
          {(formattedTime) => (
            <TimerWrapper
              len={formattedTime.length}
              waitingOnBlock={!crewIsBusy}>
              {formattedTime}
            </TimerWrapper>
          )}
        </LiveTimer>
        {!crew._location?.asteroidId && (
          <>
            <label>In Flight</label>
            <IconWrapper><ShipIcon /></IconWrapper>
          </>
        )}
        {crew._location?.asteroidId && (
          crew.Crew?.readyAt < scheduleEnd
          ? (
            <>
              {crewIsBusy && <label>Working</label>}
              <IconWrapper><CrewBusyIcon /></IconWrapper>
            </>
          )
          : (
            <>
              <label>Schedule Full</label>
              <IconWrapper><ScheduleFullIcon /></IconWrapper>
            </>
          )
        )}
      </BusyStatusContainer>
    );
  }
  if (!isLaunched) {
    return (
      <StatusContainer {...props}>
        <label style={{ opacity: 0.3 }}>Unlaunched</label> 
        <IconWrapper style={{ opacity: 0.5 }}><TimerIcon /></IconWrapper>
      </StatusContainer>
    );
  }
  return (
    <StatusContainer {...props}>
      <label>Ready</label> 
      <IconWrapper><CrewIdleIcon /></IconWrapper>
    </StatusContainer>
  );
}

export default LiveReadyStatus;