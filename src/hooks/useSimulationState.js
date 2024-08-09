import { useMemo } from 'react';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';

const useSimulationState = () => {
  const { accountAddress } = useSession(false);
  const simulationEnabled = useStore(s => s.simulationEnabled);
  const simulationState = useStore(s => s.simulation);
  
  return useMemo(
    () => !accountAddress && simulationEnabled ? simulationState : null,
    [accountAddress, simulationEnabled, simulationState]
  );
};

export default useSimulationState;