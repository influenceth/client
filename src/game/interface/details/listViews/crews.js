import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Address } from '@influenceth/sdk';

import { MyAssetIcon } from '~/components/Icons';
import OnClickLink from '~/components/OnClickLink';
import MarketplaceLink from '~/components/MarketplaceLink';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';

const useColumns = () => {
  const { accountAddress } = useSession();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => {
          if (accountAddress && row.Nft?.owner && Address.areEqual(row.Nft.owner, accountAddress)) {
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
        selector: row => <Link to={`/crew/${row.id}`}>{formatters.crewName(row)}</Link>,
        unhideable: true
      },
      { // TODO: do we want this here?
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

    return columns.filter((c) => accountAddress || !c.requireLogin);
  }, [accountAddress]);
};

export default useColumns;