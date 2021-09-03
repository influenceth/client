import utils from 'influence-utils';
import DataTable, { createTheme } from 'react-data-table-component';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import Details from '~/components/Details';
import Pagination from '~/components/Pagination';
import theme from '~/theme';

const columns = [
  {
    name: 'Name',
    selector: row => row.name,
    sortable: false
  },
  {
    name: 'Radius',
    selector: row => row.radius,
    sortable: true,
    format: row => `${row.radius?.toLocaleString()} km`
  },
  {
    name: 'Spectral Type',
    selector: row => row.spectralType,
    sortable: true,
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
    format: row => `${row.orbital?.a} AU`
  },
  {
    name: 'Eccentricity',
    selector: row => row.orbital.e,
    sortable: true,
  },
  {
    name: 'Inclination',
    selector: row => row.orbital.i,
    sortable: true,
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

const OwnedAsteroidsTable = (props) => {
  const { data: asteroids } = useOwnedAsteroids();

  return (
    <Details title="Owned Asteroids">
      <DataTable
        columns={columns}
        data={asteroids}
        fixedHeader
        fixedHeaderScrollHeight="calc(100vh - 355px)"
        highlightOnHover={true}
        pagination
        paginationComponent={Pagination}
        paginationPerPage={25}
        paginationRowsPerPageOptions={[ 10, 15, 20, 25 ]}
        customStyles={styleOverrides}
        theme="influence" />
    </Details>
  );
};

export default OwnedAsteroidsTable;
