import { useContext } from 'react';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';

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

const Time = (props) => {
  const { displayTime } = useContext(ClockContext);

  return (
    <StyledTime {...props}>
      <DaysSince>
        <span>{displayTime} days</span>
      </DaysSince>
    </StyledTime>
  );
};

export default Time;
