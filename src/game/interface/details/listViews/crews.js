import { useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import { MyAssetIcon } from '~/components/Icons';
import OnClickLink from '~/components/OnClickLink';
import MarketplaceLink from '~/components/MarketplaceLink';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';

const useColumns = () => {
  const { account } = useAuth();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => {
          if (account && row.Nft?.owner && Address.areEqual(row.Nft.owner, account)) {
            return <MyAssetIcon />
          }
          return '';
        },
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        label: 'Name',
        sortField: 'Name.name.raw',
        selector: row => formatters.crewName(row),
        unhideable: true
      },
      {
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
                    {account && Address.areEqual(row.Nft.owner, account)
                      ? `you`
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
        key: 'roster',
        label: 'Roster',
        selector: row => {
          let roster = (row.Crew.roster || []).join(', ');

          if (row.meta?.crewmates?.length > 0) {
            roster = row.meta.crewmates.map((cm) => cm.name).join(', ');
          }

          return roster;
        }
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account]);
};

export default useColumns;