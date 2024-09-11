import { useContext } from '~/lib/react-debug';

import CrewContext from '~/contexts/CrewContext';

const useCrewContext = () => {
  return useContext(CrewContext);
};

export default useCrewContext;
