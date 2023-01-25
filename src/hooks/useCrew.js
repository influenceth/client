import { useContext } from 'react';

import CrewContext from '~/contexts/CrewContext';

const useCrew = () => {
  return useContext(CrewContext);
};

export default useCrew;
