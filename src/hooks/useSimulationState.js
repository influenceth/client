import useStore from '~/hooks/useStore';

const useSimulationState = () => {
  // not if actually authenticated
  return useStore(s => !s.currentSession?.accountAddress && s.simulationEnabled ? s.simulation : null);
};

export default useSimulationState;