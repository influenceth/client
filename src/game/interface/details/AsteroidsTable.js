import { useEffect } from 'react';
import { Asteroid } from '@influenceth/sdk';
import { Link } from 'react-router-dom';
import DataTable, { createTheme } from 'react-data-table-component';

import usePagedAssets from '~/hooks/usePagedAssets';
import Details from '~/components/Details';
import OnClickLink from '~/components/OnClickLink';
import Pagination from '~/components/Pagination';
import theme from '~/theme';
import MarketplaceLink from '~/components/MarketplaceLink';
import formatters from '~/lib/formatters';

const columns = [
  {
    align: 'left',
    name: 'Name',
    selector: row => row.Name?.name,
    sortable: false,
    format: row => <Link to={`/asteroids/${row.i}`}>{formatters.asteroidName(row)}</Link>
  },
  {
    name: 'Owner',
    selector: row => row.Nft?.owner,
    sortable: true,
    sortKey: 'Nft.owner',
    format: row => {
      if (row.Nft?.owner) {
        return (
          <MarketplaceLink
            chain={row.Bridge?.destination}
            assetType="account"
            id={row.Nft?.owner}>
            {(onClick, setRefEl) => (
              <OnClickLink ref={setRefEl} onClick={onClick}>{row.Nft?.owner}</OnClickLink>
            )}
          </MarketplaceLink>
        );
      } else {
        return 'Un-owned';
      }
    }
  },
  {
    name: 'Radius',
    selector: row => row.Celestial.radius,
    sortable: true,
    sortKey: 'radius',
    format: row => `${row.Celestial.radius.toLocaleString()} km`
  },
  {
    name: 'Spectral Type',
    selector: row => row.Celestial.spectralType,
    format: row => `${Asteroid.getSpectralType(row)}-type`
  },
  {
    name: 'Rarity',
    selector: row => row.Celestial.bonuses,
    format: row => Asteroid.getRarity(row)
  },
  {
    name: 'Semi-major Axis',
    selector: row => row.Orbit.a,
    sortable: true,
    sortKey: 'axis',
    format: row => `${row.Orbit.a} AU`
  },
  {
    name: 'Eccentricity',
    selector: row => row.Orbit.ecc,
    sortable: true,
    sortKey: 'eccentricity'
  },
  {
    name: 'Inclination',
    selector: row => row.Orbit.inc,
    sortable: true,
    sortKey: 'inclination',
    format: row => `${(row.Orbit.inc * 180 / Math.PI).toLocaleString()}°`
  }
];

const styleOverrides = {
  headCells: {
    style: {
      color: theme.colors.main,
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase'
    }
  }
};

const AsteroidsTable = () => {
  const { query, setPage, setPerPage, setSort } = usePagedAssets('asteroids');

  const handleSort = (field, direction) => {
    direction = direction.charAt(0).toUpperCase() + direction.slice(1);
    setSort(field.sortKey + direction);
  };

  useEffect(() => {
    if (query?.data?.length === 0) setPage(1);
  }, [ query?.data, setPage ]);

  return (
    <Details title="Mapped Asteroids">
      <DataTable
        columns={columns}
        data={query?.data || []}
        onChangeRowsPerPage={setPerPage}
        onChangePage={setPage}
        onSort={handleSort}
        sortServer
        progressPending={query?.isLoading}
        fixedHeader
        fixedHeaderScrollHeight="calc(100vh - 355px)"
        highlightOnHover
        pagination
        paginationComponent={Pagination}
        paginationServer
        paginationPerPage={25}
        customStyles={styleOverrides}
        theme="influence" />
    </Details>
  );
};

export default AsteroidsTable;
