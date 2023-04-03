import { useEffect } from 'react';
import { toRarity, toSpectralType } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';
import DataTable, { createTheme } from 'react-data-table-component';

import useWatchlist from '~/hooks/useWatchlist';
import useStore from '~/hooks/useStore';
import Details from '~/components/Details';
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
    format: row => `${toSpectralType(row.spectralType)}-type`
  },
  {
    name: 'Rarity',
    selector: row => row.bonuses,
    format: row => toRarity(row.bonuses)
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
const WatchlistTable = (props) => {
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
