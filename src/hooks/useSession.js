import { useContext, useMemo } from '~/lib/react-debug';

import SessionContext from '~/contexts/SessionContext';
import SIMULATION_CONFIG from '~/simulation/simulationConfig';
import useSimulationState from './useSimulationState';
import useStore from '~/hooks/useStore';


const useSession = (includeSimulationOverrides = true) => {
  const context = useContext(SessionContext);

  const simulationEnabled = useStore(s => s.simulationEnabled);
  const simulationState = useStore(s => s.simulation);

  const [simulationOverrides, overrideBlockTime] = useMemo(import.meta.url, () => {
    if (includeSimulationOverrides && simulationEnabled && !context?.accountAddress) {
      return [
        simulationState,
        Math.floor(Date.now() / 100e3) * 100
      ];
    }
    return [null, null];
  }, [context?.accountAddress, includeSimulationOverrides, simulationEnabled, simulationState]);

  return useMemo(import.meta.url, () => {
    if (simulationOverrides) {
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
  }, [context, simulationOverrides, overrideBlockTime]);
};

export default useSession;
