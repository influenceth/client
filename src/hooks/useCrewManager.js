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
    ({ crewmate }) => {
      if (crewmate.Crewmate.coll !== Crewmate.COLLECTION_IDS.ADALIAN) {
        console.log('--- InitializeArvadian', {
          crewmate: { id: crewmate.id, label: Entity.IDS.CREWMATE },
          impactful: crewmate.Crewmate.impactful,
          cosmetic: crewmate.Crewmate.cosmetic,
          caller_crew: crewmate.Control.controller,
          name: crewmate.Name.name
        });
        execute('InitializeArvadian', {
          crewmate: { id: crewmate.id, label: Entity.IDS.CREWMATE },
          impactful: crewmate.Crewmate.impactful,
          cosmetic: crewmate.Crewmate.cosmetic,
          caller_crew: crewmate.Control.controller,
          name: crewmate.Name.name
        });

      } else {
        const appearance = Crewmate.unpackAppearance(crewmate.Crewmate.appearance);
        execute('RecruitAdalian', {
          crewmate: { id: crewmate.id, label: Entity.IDS.CREWMATE },
          class: crewmate.Crewmate.class,
          impactful: crewmate.Crewmate.impactful,
          cosmetic: crewmate.Crewmate.cosmetic,
          gender: appearance.gender,
          body: appearance.body,
          face: appearance.face,
          hair: appearance.hair,
          hair_color: appearance.hairColor,
          clothes: appearance.clothes,
          station: crewmate.Location,
          caller_crew: crewmate.Control.controller,
          name: crewmate.Name.name
        });
      }
    },
    [adalianRecruits, execute]
  );

  const getPendingCrewmate = useCallback(
    () => {
      if (adalianRecruits.length > 0) {
        return getPendingTx('InitializeArvadian', {});
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
