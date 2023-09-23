import { useContext } from 'react';

import ActivitiesContext from '~/contexts/ActivitiesContext';

const useActivitiesContext = () => {
  return useContext(ActivitiesContext);
};

export default useActivitiesContext;
