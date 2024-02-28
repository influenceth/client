import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import actionStages from '~/lib/actionStages';
import { locationsArrToObj } from '~/lib/utils';
import useEntity from '../useEntity';

const useStationCrewManager = (destination) => {
  const { crew, isLoading } = useCrewContext();
  const { execute, getPendingTx } = useContext(ChainTransactionContext);

  const { data: destEntity } = useEntity(destination);
  const destLotId = useMemo(() => {
    return locationsArrToObj(destEntity?.Location?.locations || [])?.lotId;
  }, [destEntity?.Location?.locations]);

  const caller_crew = useMemo(() => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const stationCrew = useCallback(
    () => execute('StationCrew', { destination, caller_crew }, { destLotId }),
    [caller_crew, destination, destLotId, execute]
  );

  const currentStationing = useMemo(
    () => getPendingTx ? getPendingTx('StationCrew', { caller_crew }) : null,
    [caller_crew, getPendingTx]
  );

  return {
    isLoading,
    stationCrew,

    currentStationing,
    actionStage: currentStationing ? actionStages.STARTING : actionStages.NOT_STARTED,
  };
};

export default useStationCrewManager;
