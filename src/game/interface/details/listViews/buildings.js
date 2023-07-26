import { useMemo } from 'react';
import { Building } from '@influenceth/sdk';

import { MyAssetIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import { LocationLink } from './components';

const useColumns = () => {
  const { account } = useAuth();
  const { crew } = useCrewContext();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => row.lot?.occupier?.i === crew?.i ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        label: 'Building Type',
        sortField: 'type',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroid?.i} lotId={row.lot?.i} zoomToLot />
            <span>{Building.TYPES[row.type].name}</span>
          </>
        ),
        unhideable: true
      },
      {
        key: 'asteroid',
        label: 'Asteroid',
        sortField: 'asteroid.i',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroid?.i} />
            <span>{row.asteroid?.i ? row.asteroid.i.toLocaleString() : null}</span>
          </>
        ),
      },
      {
        key: 'lot',
        label: 'Lot',
        sortField: 'lot.i',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroid?.i} lotId={row.lot?.i} />
            <span>{row.lot?.i ? row.lot.i.toLocaleString() : null}</span>
          </>
        ),
      },
      {
        key: 'controller',
        label: 'Lot Controller',
        sortField: 'lot.controller.i',
        selector: row => {
          if (row.lot?.controller?.i) {
            return row.lot.controller.i === crew?.i ? 'you' : row.lot.controller.i.toLocaleString();
          }
          return 'Uncontrolled';
        }
      },
      {
        key: 'occupier',
        label: 'Lot Occupier',
        sortField: 'lot.occupier.i',
        selector: row => {
          if (row.lot?.occupier?.i) {
            return row.lot.occupier.i === crew?.i ? 'you' : row.lot.occupier.i.toLocaleString();
          }
          return 'Unoccupied';
        }
      },
      {
        key: 'occupation',
        label: 'Occupation Type',
        selector: row => row.lot?.occupier?.isSquatter ? 'Squatting' : (row.lot?.controller?.isRenter ? 'Renting' : ''),
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crew?.i]);
};

export default useColumns;