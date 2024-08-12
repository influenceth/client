import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';

const useSimulationEnabled = () => {
  const { accountAddress } = useSession(false);
  const simulationEnabled = useStore(s => s.simulationEnabled);
  return !accountAddress && simulationEnabled;
};

export default useSimulationEnabled;