import { useCallback } from 'react';

import { SetCourseIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const SetCourse = ({ onSetAction }) => {
  const { crew } = useCrewContext();
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  
  const handleClick = useCallback(() => {
    onSetAction('SET_COURSE', { travelSolution });
  }, [travelSolution]);

  return (
    <ActionButton
      flags={{
        attention: crew && travelSolution && !travelSolution.invalid,
        // TODO: remove false
        disabled: false && !(crew && travelSolution && !travelSolution.invalid),
      }}
      label="Set Course"
      icon={<SetCourseIcon />}
      onClick={handleClick} />
  );
};

export default SetCourse;