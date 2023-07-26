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

const columns = [
  {
    align: 'left',
    name: 'Name',
    selector: row => row.name,
    sortable: false,
    format: row => <Link to={`/asteroids/${row.i}`}>{row.name}</Link>
  },
  {
    name: 'Owner',
    selector: row => row.owner,
    sortable: true,
    sortKey: 'owner',
    format: row => {
      if (row.owner) {
        return (
          <MarketplaceLink
            chain={row.chain}
            assetType="account"
            id={row.owner}>
            {(onClick, setRefEl) => (
              <OnClickLink ref={setRefEl} onClick={onClick}>{row.owner}</OnClickLink>
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
    selector: row => row.radius,
    sortable: true,
    sortKey: 'radius',
    format: row => `${row.radius?.toLocaleString()} km`
  },
  {
    name: 'Spectral Type',
    selector: row => row.spectralType,
    format: row => `${Asteroid.getSpectralType(row.spectralType)?.name || ''}-type`
  },
  {
    name: 'Rarity',
    selector: row => row.bonuses,
    format: row => Asteroid.getRarity(row.bonuses)
  },
  {
    name: 'Semi-major Axis',
    selector: row => row.orbital.a,
    sortable: true,
    sortKey: 'axis',
    format: row => `${row.orbital?.a} AU`
  },
  {
    name: 'Eccentricity',
    selector: row => row.orbital.e,
    sortable: true,
    sortKey: 'eccentricity'
  },
  {
    name: 'Inclination',
    selector: row => row.orbital.i,
    sortable: true,
    sortKey: 'inclination',
    format: row => `${(row.orbital.i * 180 / Math.PI).toLocaleString()}°`
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
