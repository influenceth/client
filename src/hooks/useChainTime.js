import { useContext } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useChainTime = () => {
  const { chainTime } = useContext(ChainTransactionContext);
  return chainTime;
};

export default useChainTime;
