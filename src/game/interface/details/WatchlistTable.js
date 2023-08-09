import { useEffect } from 'react';
import { Asteroid } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';
import DataTable from 'react-data-table-component';

import useWatchlist from '~/hooks/useWatchlist';
import Details from '~/components/Details';
import theme from '~/theme';

const columns = [
  {
    name: 'Name',
    selector: row => row.Name.name,
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
    format: row => Asteroid.getRarity(row)
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

// TODO: (this component is probably deprecated)
const WatchlistTable = () => {
  const { watchlist: { data: watchlist }} = useWatchlist();
  const active = true;
  const history = useHistory();

  // Close if the watchlist section is closed
  useEffect(() => {
    if (!active) history.push('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ active ]);

  return (
    <Details title="Watched Asteroids">
      <DataTable
        columns={columns}
        data={watchlist.map(w => w.asteroid)}
        fixedHeader={true}
        fixedHeaderScrollHeight="calc(100vh - 256px)"
        highlightOnHover={true}
        pagination
        paginationPerPage={25}
        paginationRowsPerPageOptions={[ 10, 15, 20, 25 ]}
        customStyles={styleOverrides}
        theme="influence" />
    </Details>
  );
};

export default WatchlistTable;
