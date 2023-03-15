import { useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import OnClickLink from '~/components/OnClickLink';
import MarketplaceLink from '~/components/MarketplaceLink';
import {
  MyAssetIcon,
  PlanBuildingIcon,
  WalletIcon
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import { LocationLink } from './components';

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
        requireLogin: true
      },
      {
        key: 'asteroidId',
        label: 'Asteroid Id',
        // TODO: make sortable
        // sortField: 'baseName',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroid} />
            <span>{row.asteroid.toLocaleString()}</span>
          </>
        ),
      },
      {
        // TODO: this might be a crew id?
        key: 'controller',
        icon: <WalletIcon />,
        label: 'Controller',
        sortField: 'controller',
        selector: row => {
          if (row.controller) {
            return (
              <MarketplaceLink
                chain={row.chain}
                assetType="account"
                id={row.controller}>
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
          return 'Uncontrolled';
        }
      },
      {
        key: 'occupier',
        icon: <WalletIcon />,
        label: 'Occupier',
        sortField: 'occupier',
        selector: row => {
          if (row.occupier) {
            return row.occupier;
          }
          return 'Unoccupied';
        }
      },
      {
        key: 'building',
        icon: <PlanBuildingIcon />, // TODO: ...
        label: 'Radius',
        sortField: 'r',
        selector: row => `${row.r?.toLocaleString()} km`,
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account]);
};

export default useColumns;