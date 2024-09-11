import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import actionStages from '~/lib/actionStages';

const useShipEmergencyManager = () => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();

  const caller_crew = useMemo(import.meta.url, () => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const activateEmergencyMode = useCallback(import.meta.url, () => {
    execute(
      'ActivateEmergency',
      { caller_crew },
      {/* TODO: meta? */}
    );
  }, [caller_crew]);

  const deactivateEmergencyMode = useCallback(import.meta.url, () => {
    execute(
      'DeactivateEmergency',
      { caller_crew },
      {/* TODO: meta? */}
    );
  }, []);

  const collectEmergencyPropellant = useCallback(import.meta.url, () => {
    execute(
      'CollectEmergencyPropellant',
      { caller_crew },
      {/* TODO: meta? */}
    );
  }, []);

  const isActivating = useMemo(import.meta.url, 
    () => getStatus('ActivateEmergency', { caller_crew }) === 'pending',
    [getStatus, caller_crew]
  );
  const isDeactivating = useMemo(import.meta.url, 
    () => getStatus('DeactivateEmergency', { caller_crew }) === 'pending',
    [getStatus, caller_crew]
  );
  const isCollecting = useMemo(import.meta.url, 
    () => getStatus('CollectEmergencyPropellant', { caller_crew }) === 'pending',
    [getStatus, caller_crew]
  );

  return {
    activateEmergencyMode,
    deactivateEmergencyMode,
    collectEmergencyPropellant,

    isActivating,
    isDeactivating,
    isCollecting,

    actionStage: (isActivating || isDeactivating || isCollecting) ? actionStages.STARTING : actionStages.NOT_STARTED,
  };
};

export default useShipEmergencyManager;
