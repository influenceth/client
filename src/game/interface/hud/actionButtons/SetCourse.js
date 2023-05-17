import { useCallback } from 'react';

import { SetCourseIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const SetCourse = ({}) => {
  const { account } = useAuth();
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  
  const handleClick = useCallback(() => {
    console.log('SET ROUTE', travelSolution);
  }, [travelSolution]);

  return (
    <ActionButton
      flags={{
        attention: account && travelSolution && !travelSolution.invalid,
        disabled: !(account && travelSolution && !travelSolution.invalid),
      }}
      label="Set Course"
      icon={<SetCourseIcon />}
      onClick={handleClick} />
  );
};

export default SetCourse;