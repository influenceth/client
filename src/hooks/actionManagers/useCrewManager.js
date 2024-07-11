import { useCallback, useContext } from 'react';
import { Crewmate, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { fireTrackingEvent } from '~/lib/utils';

const useCrewManager = () => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);

  const changeActiveCrew = useCallback(
    (params) => execute('SET_ACTIVE_CREW', params),
    [execute]
  );
  const getPendingActiveCrewChange = useCallback(
    (params) => getPendingTx('SET_ACTIVE_CREW', params),
    [getPendingTx]
  );

  const purchaseCredits = useCallback((tally) => {
    for (let i = 0; i < tally; i++) fireTrackingEvent('purchase_crewmate', { category: 'purchase', amount: 5 });
    execute('BulkPurchaseAdalians', { collection: Crewmate.COLLECTION_IDS.ADALIAN, tally });
  }, [execute]);

  const getPendingCreditPurchase = useCallback(() => {
    return getPendingTx('BulkPurchaseAdalians', {});
  }, [getPendingTx]);

  const purchaseAndOrInitializeCrewmate = useCallback(
    ({ crewmate }) => {
      if (crewmate.Crewmate.coll !== Crewmate.COLLECTION_IDS.ADALIAN) {
        execute('InitializeArvadian', {
          crewmate: { id: crewmate.id, label: Entity.IDS.CREWMATE },
          impactful: crewmate.Crewmate.impactful,
          cosmetic: crewmate.Crewmate.cosmetic,
          station: crewmate.Location,
          caller_crew: crewmate.Control.controller,
          name: crewmate.Name.name
        });

      } else {
        if (!(crewmate?.id > 0)) fireTrackingEvent('purchase_crewmate', { category: 'purchase', amount: 5 });
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
    [execute]
  );

  const getPendingCrewmate = useCallback(
    () => getPendingTx('InitializeArvadian', {}) || getPendingTx('RecruitAdalian', {}),
    [getPendingTx]
  );

  return {
    changeActiveCrew,
    getPendingActiveCrewChange,
    purchaseCredits,
    purchaseAndOrInitializeCrewmate,
    getPendingCrewmate,
    getPendingCreditPurchase,
  };
};

export default useCrewManager;
