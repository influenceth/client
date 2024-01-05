import { useCallback, useMemo } from 'react';

import { SetCourseIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const SetCourse = ({ crew, onSetAction }) => {
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  
  const handleClick = useCallback(() => {
    onSetAction('SET_COURSE', { travelSolution });
  }, [travelSolution]);

  const disabledReason = useMemo(() => {
    if (!crew?._ready) return 'crew is busy';
    if (travelSolution?.invalid) return 'invalid travel solution';
    return '';
  }, [crew?._ready, travelSolution?.invalid]);

  return (
    <ActionButton
      label="Set Course"
      labelAddendum={disabledReason}
      flags={{
        attention: crew && travelSolution && !travelSolution.invalid,
        disabled: disabledReason || undefined,
      }}
      icon={<SetCourseIcon />}
      onClick={handleClick} />
  );
};

export default SetCourse;