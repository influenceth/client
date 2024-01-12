import { useContext } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useBlockTime = () => {
  const { blockTime } = useContext(ChainTransactionContext);
  return blockTime;
};

export default useBlockTime;
