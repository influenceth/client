import { useContext } from 'react';

import WalletContext from '~/contexts/WalletContext';

const useBlockTime = () => {
  const { blockTime } = useContext(WalletContext);
  return blockTime;
};

export default useBlockTime;
