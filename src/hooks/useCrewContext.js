import { useContext } from 'react';

import CrewContext from '~/contexts/CrewContext';

const useCrewContext = () => {
  return useContext(CrewContext);
};

export default useCrewContext;
