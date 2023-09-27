import { Asteroid } from '@influenceth/sdk';
import DataTable, { createTheme } from 'react-data-table-component';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import Details from '~/components/Details';
import Pagination from '~/components/Pagination';
import theme from '~/theme';

const columns = [
  {
    name: 'Name',
    selector: row => row.Name?.name,
    sortable: false
  },
  {
    name: 'Radius',
    selector: row => row.Celestial.radius,
    sortable: true,
    format: row => `${row.Celestial.radius?.toLocaleString()} km`
  },
  {
    name: 'Spectral Type',
    selector: row => row.Celestial.spectralType,
    sortable: true,
    format: row => `${Asteroid.getSpectralType(row)}-type`
  },
  {
    name: 'Rarity',
    selector: row => row.Celestial.bonuses,
    format: row => Asteroid.getRarity(row.Celestial.bonuses)
  },
  {
    name: 'Semi-major Axis',
    selector: row => row.Orbit.a,
    sortable: true,
    format: row => `${row.Orbit.a} AU`
  },
  {
    name: 'Eccentricity',
    selector: row => row.Orbit.ecc,
    sortable: true,
  },
  {
    name: 'Inclination',
    selector: row => row.Orbit.inc,
    sortable: true,
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

const OwnedAsteroidsTable = () => {
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
