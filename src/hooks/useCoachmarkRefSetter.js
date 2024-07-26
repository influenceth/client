import { useContext } from 'react';
import CoachmarkContext from '~/contexts/CoachmarkContext';

const useCoachmarkRefSetter = () => {
  return useContext(CoachmarkContext);
}

export default useCoachmarkRefSetter;