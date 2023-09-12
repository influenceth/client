import { useCallback, useContext, useMemo } from 'react';
import { Crewmate, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from './useCrewContext';

const useCrewManager = () => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { adalianRecruits, crewmateMap } = useCrewContext();

  const changeActiveCrew = useCallback(
    (params) => execute('SET_ACTIVE_CREW', params),
    [execute]
  );
  const getPendingActiveCrewChange = useCallback(
    (params) => getPendingTx('SET_ACTIVE_CREW', params),
    [getPendingTx]
  );

  const purchaseAndOrInitializeCrew = useCallback(
    (params) => {
      if (adalianRecruits.length > 0) {
        execute('INITIALIZE_CREWMATE', { i: adalianRecruits[0].i, ...params });
      } else {
        const appearance = Crewmate.unpackAppearance(params.features.Crewmate.appearance);
        execute('RecruitAdalian', {
          crewmate: { id: 0, label: Entity.IDS.CREWMATE },  // TODO: may already have an id
          class: params.features.Crewmate.class,
          impactful: params.features.Crewmate.impactful,
          cosmetic: params.features.Crewmate.cosmetic,
          gender: appearance.gender,
          body: appearance.body,
          face: appearance.face,
          hair: appearance.hair,
          hair_color: appearance.hairColor,
          clothes: appearance.clothes,
          station: { id: 1, label: Entity.IDS.BUILDING }, // TODO: should not be hardcoded
          caller_crew: { id: params.crewId, label: Entity.IDS.CREW },
          name: params.name
        });
      }
    },
    [adalianRecruits, execute]
  );

  const getPendingCrewmate = useCallback(
    () => {
      if (adalianRecruits.length > 0) {
        return getPendingTx('INITIALIZE_CREWMATE', { i: adalianRecruits[0].i });
      } else {
        return getPendingTx('RecruitAdalian', {});
      }
    },
    [adalianRecruits, getPendingTx]
  );

  return {
    changeActiveCrew,
    getPendingActiveCrewChange,
    purchaseAndOrInitializeCrew,
    getPendingCrewmate,
    adalianRecruits,
  };
};

export default useCrewManager;
