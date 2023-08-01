import { useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import { MyAssetIcon } from '~/components/Icons';
import OnClickLink from '~/components/OnClickLink';
import MarketplaceLink from '~/components/MarketplaceLink';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';

const useColumns = () => {
  const { account } = useAuth();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => {
          if (account && row.owner && Address.areEqual(row.owner, account)) {
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
        // sortField: 'name', // TODO: 
        selector: row => '',
        unhideable: true
      },
      {
        key: 'owner',
        label: 'Owner',
        sortField: 'owner',
        selector: row => {
          if (row.owner) {
            return (
              <MarketplaceLink
                chain={row.chain}
                assetType="account"
                id={row.owner}>
                {(onClick, setRefEl) => (
                  <OnClickLink ref={setRefEl} onClick={onClick}>
                    {account && Address.areEqual(row.owner, account)
                      ? `you`
                      : `${row.owner.substr(0, 6)}...${row.owner.substr(-4)}`
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
        selector: row => (row.crewmates || []).join(', '),
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account]);
};

export default useColumns;