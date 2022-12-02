import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useCoreSample = (asteroidId, plotId, resourceId, crewId) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  // TODO: need to handle selecting existing sampleId
  const payload = useMemo(
    () => ({ asteroidId, plotId, resourceId, crewId }),
    [asteroidId, plotId, resourceId, crewId]
  );

  const startCoreSample = useCallback(
    () => execute('START_CORE_SAMPLE', payload),
    [execute, payload]
  );

  const finalizeCoreSample = useCallback(
    () => execute('FINALIZE_CORE_SAMPLE', { i }),
    [execute, i]
  );

  const startingSample = useMemo(
    () => getStatus('START_CORE_SAMPLE', payload),
    [getStatus, payload]
  );

  const finalizingSample = useMemo(
    () => getStatus('FINALIZE_CORE_SAMPLE', { i }),
    [getStatus, i]
  );

  console.log(startingSample,finalizingSample);

  return {
    startCoreSample,
    finalizeCoreSample,
    // scanStatus // TODO: ...
  };
};

export default useCoreSample;
