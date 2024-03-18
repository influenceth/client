import { useMemo } from 'react';
import { Address, Crewmate } from '@influenceth/sdk';

import {
  CrewIcon,
  CrewmateIcon,
  MyAssetIcon,
} from '~/components/Icons';
import useSession from '~/hooks/useSession';
import OnClickLink from '~/components/OnClickLink';
import MarketplaceLink from '~/components/MarketplaceLink';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';

const useColumns = () => {
  const { accountAddress } = useSession();
  const { crewmateMap } = useCrewContext();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => !!crewmateMap[row.id] ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        icon: <CrewmateIcon />,
        label: 'Name',
        sortField: 'Name.name.raw',
        selector: row => formatters.crewmateName(row),
        unhideable: true
      },
      { // TODO: should this be removed?
        key: 'owner',
        label: 'Owner',
        sortField: 'Nft.owner',
        selector: row => {
          if (row.Nft?.owner) {
            return (
              <MarketplaceLink
                chain={row.Nft.chain}
                assetType="account"
                id={row.Nft.owner}>
                {(onClick, setRefEl) => (
                  <OnClickLink ref={setRefEl} onClick={onClick}>
                    {accountAddress && Address.areEqual(row.Nft.owner, accountAddress)
                      ? `you` // TODO: should this be <Me /> like in ships list config?
                      : `${row.Nft.owner.substr(0, 6)}...${row.Nft.owner.substr(-4)}`
                    }
                  </OnClickLink>
                )}
              </MarketplaceLink>
            );
          }
          return 'Un-owned';
        }
      },
      {
        key: 'crew',
        icon: <CrewIcon />,
        label: 'Crew',
        sortField: 'meta.crew.name.raw',
        selector: row => row.Control?.controller?.id ? (row.meta?.crew?.name || `#${row.Control?.controller?.id}`) : null
      },
      {
        key: 'class',
        label: 'Class',
        sortField: 'Crewmate.class',
        selector: row => row.Crewmate ? Crewmate.Entity.getClass(row)?.name : null,
      },
      {
        key: 'collection',
        label: 'Collection',
        sortField: 'Crewmate.coll',
        selector: row => row.Crewmate ? Crewmate.Entity.getCollection(row)?.name : null,
      },
      {
        key: 'traits',
        label: 'Traits',
        selector: row => {
          const traits = row.Crewmate ? Crewmate.Entity.getCombinedTraits(row) : [];

          return traits
            .map((t) => Crewmate.getTrait(t)?.name)
            .filter((t) => !!t)
            .join(', ');
        }
      },
    ];

    return columns.filter((c) => accountAddress || !c.requireLogin);
  }, [accountAddress, crewmateMap]);
};

export default useColumns;