import { useContext, useMemo } from 'react';

import SessionContext from '~/contexts/SessionContext';
import useStore from '~/hooks/useStore';
import SIMULATION_CONFIG from '~/simulation/simulationConfig';


const useSession = (includeSimulationOverrides = true) => {
  const simulationState = useStore(s => s.simulationEnabled ? s.simulation : null);
  const context = useContext(SessionContext);

  const overrideBlockTime = useMemo(() => simulationState ? Math.floor(Date.now() / 100e3) * 100 : null, [simulationState]);
  return useMemo(() => {
    if (includeSimulationOverrides && simulationState) {
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
  }, [context, includeSimulationOverrides, overrideBlockTime, simulationState]);
};

export default useSession;
