import { useEffect } from 'react';
import styled from 'styled-components';
import { START_TIMESTAMP } from 'influence-utils';

import useInterval from '~/hooks/useInterval';
import useTimeStore from '~/hooks/useTimeStore';

const StyledTime = styled.div`
  cursor: pointer;
  max-height: 44px;
  overflow: hidden;
  transition: all 0.6s ease;
  width: 180px;
`;

const DaysSince = styled.div`
  border-bottom: 4px solid rgb(255, 255, 255, 0.25);
  color: rgb(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: bold;
  height: 40px;
  letter-spacing: 3px;
  line-height: 53px;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 3px black;
  transition: all 0.4s ease;

  ${StyledTime}:hover & {
    border-bottom: 4px solid ${props => props.theme.colors.main};
    color: white;
  }
`;

// Calculate the difference in game days between the start timestamp and the lore start time
const diff = 24 * (1618668000 - START_TIMESTAMP) / 86400;

const Time = (props) => {
  const time = useTimeStore(state => state.time);
  const updateToCurrentTime = useTimeStore(state => state.updateToCurrentTime);
  const displayTime = time - diff;

  // Update time once immediately upon launching
  useEffect(() => {
    updateToCurrentTime();
  }, [ updateToCurrentTime ])

  // Automatically updates the in-game time once per second unless auto-updates are off
  useInterval(() => {
    updateToCurrentTime();
  }, 10000);

  return (
    <StyledTime>
      <DaysSince>
        <span>{displayTime >= 0 ? '+' : '-'}</span>
        <span>{displayTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span> days</span>
      </DaysSince>
    </StyledTime>
  );
};

export default Time;
