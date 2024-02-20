import { useQuery, useQueryClient } from 'react-query';
import { useMemo } from 'react';
import { Deposit, Entity, Lot, Permission, Ship } from '@influenceth/sdk';

import api from '~/lib/api';
import useEntity from './useEntity';

const useLot = (lotId) => {
  const queryClient = useQueryClient();

  const lotEntity = useMemo(() => lotId ? Entity.formatEntity({ id: lotId, label: Entity.IDS.LOT }) : null, [lotId]);

  const { data: lot, isLoading: lotIsLoading } = useEntity(lotId ? { id: lotId, label: Entity.IDS.LOT } : undefined);

  // prepop all the entities on the lot in the cache (so can do in a single query)
  const { data: lotDataPrepopped, isLoading: lotDataIsLoading } = useQuery(
    ['lotData', lotId],
    async () => {

      // populate from single query... set query data
      const lotEntities = (await api.getEntities({
        match: { 'Location.locations.uuid': lotEntity.uuid },
        components: [ // this should include all default components returned for relevant entities (buildings, ships, deposits)
          'Building', 'Control', 'Dock', 'DryDock', 'Exchange', 'Extractor', 'Inventory', 'Location', 'Name', 'Processor', 'Station',
          /*'Control',*/ 'Deposit', /*'Location',*/
          /*'Control', 'Inventory', 'Location', 'Name',*/ 'Ship', /*'Station',*/

          // these are on both buildings and ships:
          'ContractPolicy', 'PrepaidPolicy', 'PublicPolicy', 'ContractAgreement', 'PrepaidAgreement', 'WhitelistAgreement',
        ]
      })) || [];

      // update queryClient for individual entities, so that when invalidated, they are refetched
      // (when the data on the lot gets updated)
      lotEntities.forEach((e) => {
        if ([Entity.IDS.BUILDING, Entity.IDS.DEPOSIT, Entity.IDS.SHIP].includes(e.label)) {
          queryClient.setQueryData([ 'entity', e.label, e.id ], e);
        }
      });

      [Entity.IDS.BUILDING, Entity.IDS.DEPOSIT, Entity.IDS.SHIP].forEach((label) => {
        queryClient.setQueryData(
          ['entities', label, 'lot', lotId],
          lotEntities.filter((e) => e.label === label)
        );
      })

      return true;
    },
    { enabled: !!lotEntity }
  );

  // (presuming this is already loaded so doesn't cause any overhead)
  const { data: asteroid, isLoading: asteroidLoading } = useEntity({ label: Entity.IDS.ASTEROID, id: Lot.toPosition(lotId)?.asteroidId });

  // NOTE: if any of these can be created, make sure to invalidate these query keys in that activity's invalidations
  const { data: buildings, isLoading: buildingsLoading } = useQuery(
    ['entities', Entity.IDS.BUILDING, 'lot', lotId],
    () => api.getEntities({ label: Entity.IDS.BUILDING, match: { 'Location.locations.uuid': lotEntity.uuid } }),
    { enabled: !!lotDataPrepopped } // give a chance to preload the data
  );

  const { data: deposits, isLoading: depositsLoading } = useQuery(
    ['entities', Entity.IDS.DEPOSIT, 'lot', lotId],
    () => api.getEntities({ label: Entity.IDS.DEPOSIT, match: { 'Location.locations.uuid': lotEntity.uuid } }),
    { enabled: !!lotDataPrepopped } // give a chance to preload the data
  );

  const { data: ships, isLoading: shipsLoading } = useQuery(
    ['entities', Entity.IDS.SHIP, 'lot', lotId],
    () => api.getEntities({ label: Entity.IDS.SHIP, match: { 'Location.locations.uuid': lotEntity.uuid } }),
    { enabled: !!lotDataPrepopped } // give a chance to preload the data
  );

  return useMemo(() => {
    const { asteroidId, lotIndex } = Lot.toPosition(lotId) || {};
    const agreement = (lot?.PrepaidAgreements || []).find((p) => p.permission === Permission.IDS.LOT_USE)
      || (lot?.ContractPolicies || []).find((p) => p.permission === Permission.IDS.LOT_USE);
    const building = (buildings || []).find((e) => e.Building.status > 0);
    const depositsToShow = (deposits || []).filter((e) => e.Deposit.status > 0 && !(e.Deposit.status === Deposit.STATUSES.USED && e.Deposit.remainingYield === 0));
    const shipsToShow = (ships || []).filter((s) => [Ship.STATUSES.UNDER_CONSTRUCTION, Ship.STATUSES.AVAILABLE].includes(s.Ship.status));
    const surfaceShip = !building && shipsToShow.find((e) => e.Ship.status === Ship.STATUSES.AVAILABLE && e.Location.location.label === Entity.IDS.LOT);

    return {
      data: lotId ? {
        ...lotEntity,
        ...lot,
        Location: {
          location: { label: Entity.IDS.ASTEROID, id: asteroidId },
          locations: [
            lotEntity,
            { label: Entity.IDS.ASTEROID, id: asteroidId },
          ]
        },
        building,
        deposits: depositsToShow,
        ships: shipsToShow,
        surfaceShip,

        Control: agreement?.permitted?.id
          ? { controller: { id: agreement.permitted.id, label: Entity.IDS.CREW }, isExplicit: true }
          : asteroid?.Control,
        ContractPolicies: asteroid?.ContractPolicies,
        PrepaidPolicies: (asteroid?.PrepaidPolicies || []).map((p) => {
          // for simplicity, apply AP's special lot rating here so don't have to apply it everywhere else
          if (p.permission === Permission.IDS.LOT_USE && asteroid.id === 1) {
            return {
              ...p,
              rate: Math.floor(Permission.getAdaliaPrimeLotRate(p, lotIndex))
            }
          }
          return p;
        }),
        // 'ContractAgreement', 'PrepaidAgreement' should be on lot record
        // unclear what happens to 'WhitelistAgreement' or PublicPolicies
      } : undefined,
      isLoading: lotIsLoading || lotDataIsLoading || asteroidLoading || buildingsLoading || depositsLoading || shipsLoading
    };
  }, [lotId, lot, lotEntity, asteroid, buildings, deposits, ships, lotIsLoading, lotDataIsLoading, asteroidLoading, buildingsLoading, depositsLoading, shipsLoading])

};

export default useLot;
