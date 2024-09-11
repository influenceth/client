import { useContext } from '~/lib/react-debug';

import ActivitiesContext from '~/contexts/ActivitiesContext';

const useActivitiesContext = () => {
  return useContext(ActivitiesContext);
};

export default useActivitiesContext;
