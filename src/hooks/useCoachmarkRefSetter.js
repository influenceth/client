import { useContext } from '~/lib/react-debug';
import CoachmarkContext from '~/contexts/CoachmarkContext';

const useCoachmarkRefSetter = () => {
  return useContext(CoachmarkContext).register;
}

export default useCoachmarkRefSetter;