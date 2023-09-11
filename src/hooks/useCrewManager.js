import { useCallback, useContext, useMemo } from 'react';
import { Crewmate, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from './useCrewContext';

const useCrewManager = () => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { crewmateMap } = useCrewContext();

  const crewCredits = useMemo(() => {
    return Object.values(crewmateMap || {}).filter((c) => !c.crewClass);
  }, [crewmateMap]);

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
      if (crewCredits.length > 0) {
        execute('INITIALIZE_CREWMATE', { i: crewCredits[0].i, ...params });
      } else {
        const appearance = Crewmate.unpackAppearance(params.features.Crewmate.appearance);
        execute('RecruitAdalian', {
          crewmate: { id: 0, label: Entity.IDS.CREWMATE },
          class: params.features.Crewmate.class,
          impactful: params.features.Crewmate.impactful,
          cosmetic: params.features.Crewmate.cosmetic,
          gender: appearance.gender,
          body: appearance.body,
          face: appearance.face,
          hair: appearance.hair,
          hair_color: appearance.hairColor,
          clothes: appearance.clothes,
          station: { id: 1, label: Entity.IDS.BUILDING },
          caller_crew: { id: 0, label: Entity.IDS.CREW },
          name: params.name
        });
      }
    },
    [crewCredits, execute]
  );

  const getPendingCrewmate = useCallback(
    () => {
      if (crewCredits.length > 0) {
        return getPendingTx('INITIALIZE_CREWMATE', { i: crewCredits[0].i });
      } else {
        return getPendingTx('RecruitAdalian', {});
      }
    },
    [crewCredits, getPendingTx]
  );

  return {
    changeActiveCrew,
    getPendingActiveCrewChange,
    purchaseAndOrInitializeCrew,
    getPendingCrewmate,
    crewCredits,
  };
};

export default useCrewManager;
