import { useEffect } from 'react';
import styled from 'styled-components';
import { START_TIMESTAMP } from 'influence-utils';

import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';

const StyledTime = styled.div`
  cursor: ${props => props.theme.cursors.active};
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
  const time = useStore(state => state.time.current);
  const autoUpdating = useStore(state => state.time.autoUpdating);
  const zoomStatus = useStore(state => state.asteroids.zoomStatus);
  const dispatchTimeUpdated = useStore(state => state.dispatchTimeUpdated);

  const displayTime = time - diff;
  const currentTime = () => ((Date.now() / 1000) - START_TIMESTAMP) / 3600;
  const increment = zoomStatus !== 'out' ? 1000 / 30 : 10000;

  // Update time once immediately upon launching
  useEffect(() => {
    if (autoUpdating) dispatchTimeUpdated(currentTime());
  }, [ dispatchTimeUpdated, autoUpdating ])

  // Automatically updates the in-game time once per second unless auto-updates are off
  useInterval(() => {
    if (autoUpdating) dispatchTimeUpdated(currentTime());
  }, increment);

  return (
    <StyledTime {...props}>
      <DaysSince>
        <span>{displayTime >= 0 ? '+' : '-'}</span>
        <span>{displayTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span> days</span>
      </DaysSince>
    </StyledTime>
  );
};

export default Time;
