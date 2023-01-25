import { useContext } from 'react';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';
import TimeComponent from '~/components/Time';

const StyledTime = styled.div`
  cursor: ${p => p.theme.cursors.active};
  max-height: 44px;
  overflow: hidden;
  transition: all 0.6s ease;
  width: 140px;
`;

const DaysSince = styled(TimeComponent)`
  border-bottom: 4px solid rgb(255, 255, 255, 0.25);
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
      <DaysSince displayTime={displayTime} />
    </StyledTime>
  );
};

export default Time;
