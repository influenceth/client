import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import actionStages from '~/lib/actionStages';
import useShip from '~/hooks/useShip';

const useShipDockingManager = (shipId) => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: ship } = useShip(shipId);

  const caller_crew = useMemo(import.meta.url, () => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const undockShip = useCallback(import.meta.url, (hopperAssisted) => {
    execute(
      'UndockShip',
      {
        ship,
        powered: !hopperAssisted,
        caller_crew
      },
      {
        asteroidId: ship?._location?.asteroidId,
        lotId: ship?._location?.lotId,
      }
    );
  }, [caller_crew, ship]);

  const dockShip = useCallback(import.meta.url, (destination, hopperAssisted, destLotId) => {
    execute(
      'DockShip',
      {
        target: destination,
        powered: !hopperAssisted,
        caller_crew
      },
      {
        asteroidId: ship?._location?.asteroidId,
        lotId: destLotId,
        shipId
      }
    );
  }, [caller_crew]);

  const currentDockingAction = useMemo(import.meta.url, 
    () => getPendingTx ? getPendingTx('DockShip', { caller_crew }) : null
    [caller_crew, getPendingTx]
  );

  const currentUndockingAction = useMemo(import.meta.url, 
    () => getPendingTx ? getPendingTx('UndockShip', { caller_crew }) : null,
    [caller_crew, getPendingTx]
  );

  return {
    undockShip,
    dockShip,

    currentDockingAction,
    currentUndockingAction,
    actionStage: (currentDockingAction || currentUndockingAction) ? actionStages.STARTING : actionStages.NOT_STARTED,
  };
};

export default useShipDockingManager;
