import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Address, Asteroid } from '@influenceth/sdk';

import OnClickLink from '~/components/OnClickLink';
import MarketplaceLink from '~/components/MarketplaceLink';
import {
  EccentricityIcon,
  FavoriteIcon,
  InclinationIcon,
  MyAssetIcon,
  RadiusIcon,
  ResourceIcon,
  ScanAsteroidIcon,
  SemiMajorAxisIcon,
  WalletIcon
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useWatchlist from '~/hooks/useWatchlist';
import useWatchAsteroid from '~/hooks/useWatchAsteroid';
import useUnWatchAsteroid from '~/hooks/useUnWatchAsteroid';
import { LocationLink } from './components';

const FavoriteToggle = styled.span`
  cursor: ${p => p.theme.cursors.active};
  ${p => p.favorited
    ? `
      color: ${p.theme.colors.main};
      opacity: 1;
    `
    : `
      opacity: 0.4;
    `
  }
  transition: opacity 250ms ease;
  &:hover {
    opacity: 0.8;
  }
`;

const useColumns = () => {
  const { account } = useAuth();
  const { ids: watchlistIds } = useWatchlist();
  const watchAsteroid = useWatchAsteroid();
  const unWatchAsteroid = useUnWatchAsteroid();

  const toggleWatchlist = useCallback((i) => () => {
    if (watchlistIds.includes(i)) {
      unWatchAsteroid.mutate(i);
    } else {
      watchAsteroid.mutate(i);
    }
  }, [watchlistIds]);

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
        key: 'favorite',
        align: 'center',
        icon: <FavoriteIcon />,
        selector: row => {
          const isFavorited = watchlistIds.includes(row.i);
          return (
            <FavoriteToggle
              data-for="listView"
              data-tip={isFavorited ? 'Favorited' : 'Add to Favorites'}
              data-place="left"
              favorited={isFavorited}
              onClick={toggleWatchlist(row.i)}>
              <FavoriteIcon />
            </FavoriteToggle>
          );
        },
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        label: 'Name',
        // TODO: make sortable
        // sortField: 'baseName',
        selector: row => (
          <>
            <LocationLink asteroidId={row.i} />
            <span>{row.customName || row.baseName}</span>
          </>
        ),
        unhideable: true
      },
      {
        key: 'owner',
        icon: <WalletIcon />,
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
        key: 'radius',
        icon: <RadiusIcon />,
        label: 'Radius',
        sortField: 'r',
        selector: row => `${row.r?.toLocaleString()} km`,
      },
      {
        key: 'spectralType',
        icon: <ScanAsteroidIcon />,
        label: 'Spectral Type',
        sortField: 'spectralType',
        selector: row => `${Asteroid.getSpectralType(row.spectralType)?.name}-type`
      },
      {
        key: 'rarity',
        icon: <ResourceIcon />,
        label: 'Rarity',
        // TODO: sortField?
        selector: row => row.bonuses ? Asteroid.getRarity(row.bonuses) : 0,
      },
      {
        key: 'axis',
        icon: <SemiMajorAxisIcon />,
        label: 'Semi-major Axis',
        sortField: 'orbital.a',
        selector: row => `${row.orbital?.a} AU`
        
      },
      {
        key: 'eccentricity',
        icon: <EccentricityIcon />,
        label: 'Eccentricity',
        sortField: 'orbital.e',
        selector: row => row.orbital.e
      },
      {
        key: 'inclination',
        icon: <InclinationIcon />,
        label: 'Inclination',
        sortField: 'orbital.i',
        selector: row => `${(row.orbital.i * 180 / Math.PI).toLocaleString()}°`
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, watchlistIds]);
};

export default useColumns;