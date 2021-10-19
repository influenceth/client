import { useEffect } from 'react';
import utils from 'influence-utils';
import { Link } from 'react-router-dom';
import DataTable, { createTheme } from 'react-data-table-component';

import usePagedAsteroids from '~/hooks/usePagedAsteroids';
import Details from '~/components/Details';
import Pagination from '~/components/Pagination';
import theme from '~/theme';

const columns = [
  {
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
          <a href={`${process.env.REACT_APP_OPEN_SEA_URL}/accounts/${row.owner}`} rel="noreferrer" target="_blank">
            {row.owner}
          </a>
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
    format: row => `${utils.toSpectralType(row.spectralType)}-type`
  },
  {
    name: 'Rarity',
    selector: row => row.bonuses,
    format: row => utils.toRarity(row.bonuses)
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

// Create custom theme based on primary theme for DataTable
createTheme('influence', {
  text: {
    primary: theme.colors.mainText,
    secondary: theme.colors.secondaryText,
  },
  background: {
    default: 'transparent'
  },
  divider: {
    default: theme.colors.contentBorder,
  },
  button: {
    default: theme.colors.main,
    disabled: theme.colors.disabledText,
  },
  highlightOnHover: {
    default: 'rgba(255, 255, 255, 0.15)',
    text: theme.colors.main,
  },
  sortFocus: {
    default: 'white',
  }
});

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

const AsteroidsTable = (props) => {
  const { query, setPage, setPerPage, setSort } = usePagedAsteroids();

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
