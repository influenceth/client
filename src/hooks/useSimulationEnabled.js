import useStore from '~/hooks/useStore';

const useSimulationEnabled = () => {
  // not if actually authenticated
  return useStore(s => !s.currentSession?.accountAddress && s.simulationEnabled);
};

export default useSimulationEnabled;