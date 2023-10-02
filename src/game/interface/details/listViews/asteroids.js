import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Address, Asteroid } from '@influenceth/sdk';
import { constants } from '@influenceth/astro';

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
import formatters from '~/lib/formatters';

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
          // TODO: ecs refactor
          // TODO: or
          // selector: row => row.Control?.controller?.id === crew?.i ? <MyAssetIcon /> : null,
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
        key: 'favorite',
        align: 'center',
        icon: <FavoriteIcon />,
        selector: row => {
          const isFavorited = watchlistIds.includes(row.id);
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
        sortField: 'Name.name.raw',
        selector: row => (
          <>
            <LocationLink asteroidId={row.id} />
            <span>{formatters.asteroidName(row)}</span>
          </>
        ),
        unhideable: true
      },
      {
        key: 'owner',
        icon: <WalletIcon />,
        label: 'Owner',
        sortField: 'Nft.owner',
        selector: row => {
          if (row.Nft?.owner) {
            return (
              <MarketplaceLink
                chain={row.Nft?.chain}
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
        key: 'radius',
        icon: <RadiusIcon />,
        label: 'Radius',
        sortField: 'Celestial.radius',
        selector: row => `${row.Celestial.radius.toLocaleString()} km`,
      },
      {
        key: 'spectralType',
        icon: <ScanAsteroidIcon />,
        label: 'Spectral Type',
        sortField: 'Celestial.celestialType',
        selector: row => `${Asteroid.Entity.getSpectralType(row)}-type`
      },
      {
        key: 'rarity',
        icon: <ResourceIcon />,
        label: 'Rarity',
        // TODO: sortField?
        selector: row => Asteroid.Entity.getRarity(row),
      },
      {
        key: 'axis',
        icon: <SemiMajorAxisIcon />,
        label: 'Semi-major Axis',
        sortField: 'Orbit.a',
        selector: row => `${(row.Orbit.a * 1000 / constants.AU).toFixed(3)} AU`

      },
      {
        key: 'eccentricity',
        icon: <EccentricityIcon />,
        label: 'Eccentricity',
        sortField: 'Orbit.ecc',
        selector: row => row.Orbit.ecc
      },
      {
        key: 'inclination',
        icon: <InclinationIcon />,
        label: 'Inclination',
        sortField: 'Orbit.inc',
        selector: row => `${(row.Orbit.inc * 180 / Math.PI).toLocaleString()}°`
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, watchlistIds]);
};

export default useColumns;