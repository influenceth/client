import { useCallback, useContext } from 'react';

import { SetCourseIcon } from '~/components/Icons';
import ClockContext from '~/contexts/ClockContext';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const SetCourse = ({}) => {
  const { coarseTime } = useContext(ClockContext);
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  
  const handleClick = useCallback(() => {
    console.log('SET ROUTE', travelSolution);
  }, [travelSolution]);


  // TODO: any invalid reason
  const invalid = !(travelSolution?.departureTime > coarseTime);

  return (
    <ActionButton
      flags={{
        attention: !invalid,
        disabled: invalid
      }}
      label="Set Course"
      icon={<SetCourseIcon />}
      onClick={handleClick} />
  );
};

export default SetCourse;