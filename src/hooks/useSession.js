import { useContext, useMemo } from 'react';

import SessionContext from '~/contexts/SessionContext';
import SIMULATION_CONFIG from '~/simulation/simulationConfig';
import useSimulationState from './useSimulationState';


const useSession = (includeSimulationOverrides = true) => {
  const context = useContext(SessionContext);
  const simulation = useSimulationState();

  const overrideBlockTime = useMemo(() => simulation ? Math.floor(Date.now() / 100e3) * 100 : null, [simulation]);
  return useMemo(() => {
    if (includeSimulationOverrides && simulation) {
      return {
        ...context,
        accountAddress: SIMULATION_CONFIG.accountAddress,
        authenticated: true,
        authenticating: false,
        // token
        // chainId
        // provider
        // walletAccount
        // walletId
        // blockNumber
        blockTime: overrideBlockTime
      };
    }
    return context;
  }, [context, includeSimulationOverrides, overrideBlockTime, simulation]);
};

export default useSession;
