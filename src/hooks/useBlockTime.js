import { useContext } from 'react';

import SessionContext from '~/contexts/SessionContext';

const useBlockTime = () => {
  const { blockTime } = useContext(SessionContext);
  return blockTime;
};

export default useBlockTime;
