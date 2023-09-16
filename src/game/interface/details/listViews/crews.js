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
        sortField: 'Name.name',
        selector: row => formatters.crewName(row),
        unhideable: true
      },
      {
        key: 'owner',
        label: 'Owner',
        sortField: 'Nft.owners.starknet',
        selector: row => {
          if (row.Nft?.owners?.starknet) {
            return (
              <MarketplaceLink
                chain={row.Nft.chain || 'starknet'}
                assetType="account"
                id={row.Nft.owners.starknet}>
                {(onClick, setRefEl) => (
                  <OnClickLink ref={setRefEl} onClick={onClick}>
                    {account && Address.areEqual(row.Nft.owners.starknet, account)
                      ? `you`
                      : `${row.Nft.owners.starknet.substr(0, 6)}...${row.Nft.owners.starknet.substr(-4)}`
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
        selector: row => (row.Crew.roster || []).join(', '),
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account]);
};

export default useColumns;