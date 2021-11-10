import { useEffect } from 'react';
import styled from 'styled-components';
import { START_TIMESTAMP } from 'influence-utils';

import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';

const StyledTime = styled.div`
  cursor: ${p => p.theme.cursors.active};
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
    border-bottom: 4px solid ${p => p.theme.colors.main};
    color: white;
  }
`;

// Calculate the difference in game days between the start timestamp and the lore start time
// TODO: should 1618668000 be in influence-utils also?
const diff = 24 * (1618668000 - START_TIMESTAMP) / 86400;

const Time = (props) => {
  const time = useStore(s => s.time.precise);
  const autoUpdating = useStore(s => s.time.autoUpdating);
  const dispatchTimeUpdated = useStore(s => s.dispatchTimeUpdated);

  const displayTime = time - diff;
  const increment = 1000 / 30;

  // Update time once immediately upon launching
  useEffect(() => {
    if (autoUpdating) dispatchTimeUpdated();
  }, [ dispatchTimeUpdated, autoUpdating ])

  // Automatically updates the in-game time once per second unless auto-updates are off
  // TODO: might be safer to use useFrame here w/ minimum update interval OR useTimeout
  useInterval(() => {
    if (autoUpdating) dispatchTimeUpdated();
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
