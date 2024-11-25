import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import actionStages from '~/lib/actionStages';
import useShip from '~/hooks/useShip';

const useShipDockingManager = (shipId) => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: ship } = useShip(shipId);

  const caller_crew = useMemo(() => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const undockShip = useCallback((hopperAssisted) => {
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
  }, [caller_crew, execute, ship]);

  const dockShip = useCallback((destination, hopperAssisted, destLotId) => {
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
  }, [caller_crew, execute]);

  const currentDockingAction = useMemo(
    () => getPendingTx ? getPendingTx('DockShip', { caller_crew }) : null
    [caller_crew, getPendingTx]
  );

  const currentUndockingAction = useMemo(
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
