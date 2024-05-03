import { useMemo } from 'react';
import { useQuery, useQueryClient,  } from 'react-query';
import { Entity, Lot, Permission, Ship } from '@influenceth/sdk';

import api from '~/lib/api';
import useEntity from './useEntity';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useLotEntities = (lotId, entityLabel, isPreloaded) => {
  return useQuery(
    entitiesCacheKey(entityLabel, { lotId }),
    () => {
      const lotEntity = Entity.formatEntity({ id: lotId, label: Entity.IDS.LOT });
      return api.getEntities({ label: entityLabel, match: { 'Location.locations.uuid': lotEntity?.uuid } });
    },
    { enabled: !!(lotId > 0 && entityLabel && isPreloaded) }
  )
};

const useLot = (lotId) => {
  const queryClient = useQueryClient();

  const lotEntity = useMemo(() => lotId ? Entity.formatEntity({ id: lotId, label: Entity.IDS.LOT }) : null, [lotId]);
  // console.log('lotId',{ lotId, lotEntity});

  const { data: lot, isLoading: lotIsLoading } = useEntity(lotId ? { id: lotId, label: Entity.IDS.LOT } : undefined);

  // prepop all the entities on the lot in the cache (so can do in a single query)
  const { data: lotDataPrepopped, isLoading: lotDataIsLoading } = useQuery(
    ['lotEntitiesPrepopulation', lotId],
    async () => {
      if (!lotId) console.error('useLot has bad lotId');

      // populate from single query... set query data
      const lotEntities = (await api.getEntities({
        match: { 'Location.locations.uuid': lotEntity.uuid },
        components: [ // this should include all default components returned for relevant entities (buildings, ships, deposits)
          'Building', 'Control', 'Dock', 'DryDock', 'Exchange', 'Extractor', 'Inventory', 'Location', 'Name', 'Processor', 'Station',
          /*'Control',*/ 'Deposit', /*'Location',*/ 'PrivateSale',
          /*'Control', 'Inventory', 'Location', 'Name',*/ 'Nft', 'Ship', /*'Station',*/

          // these are on both buildings and ships:
          'ContractPolicy', 'PrepaidPolicy', 'PublicPolicy', 'ContractAgreement', 'PrepaidAgreement', 'WhitelistAgreement', 'WhitelistAccountAgreement',
        ]
      })) || [];

      // update queryClient for individual entities, so that when lot data invalidated, they are refetched
      // TODO: not sure why we would do this here if we are not doing everywhere with an 'entities' key?
      lotEntities.forEach((e) => {
        if ([Entity.IDS.BUILDING, Entity.IDS.DEPOSIT, Entity.IDS.SHIP].includes(e.label)) {
          queryClient.setQueryData([ 'entity', e.label, e.id ], e);
        }
      });

      [Entity.IDS.BUILDING, Entity.IDS.DEPOSIT, Entity.IDS.SHIP].forEach((label) => {
        queryClient.setQueryData(
          entitiesCacheKey(label, { lotId }),
          lotEntities.filter((e) => e.label === label)
        );
      })

      return true;
    },
    { enabled: !!lotEntity?.uuid }
  );

  // (presuming this is already loaded so doesn't cause any overhead)
  const { data: asteroid, isLoading: asteroidLoading } = useEntity(lotId ? { label: Entity.IDS.ASTEROID, id: Lot.toPosition(lotId)?.asteroidId } : undefined);

  // we try to prepop all the below in a single call above so the
  // below queries only get refreshed invididually when invalidated
  const { data: buildings, isLoading: buildingsLoading } = useLotEntities(lotId, Entity.IDS.BUILDING, !!lotDataPrepopped);
  const { data: deposits, isLoading: depositsLoading } = useLotEntities(lotId, Entity.IDS.DEPOSIT, !!lotDataPrepopped);
  const { data: ships, isLoading: shipsLoading } = useLotEntities(lotId, Entity.IDS.SHIP, !!lotDataPrepopped);

  const isLoading = lotEntity?.uuid && (lotIsLoading || lotDataIsLoading || asteroidLoading || buildingsLoading || depositsLoading || shipsLoading);
  const data = useMemo(() => {
    if (isLoading || !lotEntity?.uuid) return undefined;

    const { asteroidId, lotIndex } = Lot.toPosition(lotId) || {};
    // TODO: do we need Whitelist*Agreements here?
    const agreement = (lot?.PrepaidAgreements || lot?.ContractAgreements || []).find((a) => a.permission === Permission.IDS.USE_LOT);
    const building = (buildings || []).find((e) => e.Building.status > 0);
    const depositsToShow = (deposits || []).filter((e) => e.Deposit.status > 0);// && !(e.Deposit.status === Deposit.STATUSES.USED && e.Deposit.remainingYield === 0));
    const shipsToShow = (ships || []).filter((s) => [Ship.STATUSES.UNDER_CONSTRUCTION, Ship.STATUSES.AVAILABLE].includes(s.Ship.status));
    const surfaceShip = !building && shipsToShow.find((e) => e.Ship.status === Ship.STATUSES.AVAILABLE && e.Location.location.label === Entity.IDS.LOT);

    return {
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
        ? {
          controller: { id: agreement.permitted.id, label: Entity.IDS.CREW },
          _superController: asteroid?.control,
          _isExplicit: true,
        }
        : {
          ...asteroid?.Control,
          _superController: asteroid?.control
        },
      ContractPolicies: asteroid?.ContractPolicies,
      PrepaidPolicies: (asteroid?.PrepaidPolicies || []).map((p) => {
        // for simplicity, apply AP's special lot rating here so don't have to apply it everywhere else
        if (p.permission === Permission.IDS.USE_LOT && asteroid.id === 1) {
          return {
            ...p,
            rate: Math.floor(Permission.getAdaliaPrimeLotRate(p, lotIndex))
          }
        }
        return p;
      }),
      // 'ContractAgreement', 'PrepaidAgreement' should be on lot record
      // unclear what happens to 'WhitelistAgreement' or PublicPolicies
    };
  }, [lotEntity?.uuid, isLoading, asteroid, buildings, deposits, ships]);

  return useMemo(() => ({ data, isLoading }), [data, isLoading]);
};

export default useLot;
