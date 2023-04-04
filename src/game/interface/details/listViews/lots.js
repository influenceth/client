import { useMemo } from 'react';
import { Capable, Construction } from '@influenceth/sdk';

import {
  MyAssetIcon,
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import { LocationLink } from './components';
import useCrewContext from '~/hooks/useCrewContext';

const useColumns = () => {
  const { account } = useAuth();
  const { crew } = useCrewContext();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => {
          if (row.occupier?.i && row.occupier.i === crew?.i) {
            return <MyAssetIcon />
          }
          return '';
        },
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'asteroid',
        label: 'Asteroid Id',
        sortField: 'asteroid.i',
        selector: row => row.asteroid?.i
          ? (
            <>
              <LocationLink asteroidId={row.asteroid.i} />
              <span>{row.asteroid.i.toLocaleString()}</span>
            </>
          )
          : null,
      },
      {
        key: 'i',
        label: 'Lot Id',
        sortField: 'i',
        selector: row => row.asteroid?.i && row.i
          ? (
            <>
              <LocationLink asteroidId={row.asteroid.i} lotId={row.i} />
              <span>{row.i.toLocaleString()}</span>
            </>
          )
          : null,
        unhideable: true,
      },
      {
        key: 'controller',
        label: 'Controller',
        sortField: 'controller.i',
        selector: row => {
          if (row.controller?.i) {
            return row.controller.i === crew?.i ? 'you' : row.controller.i.toLocaleString();
          }
          return 'Uncontrolled';
        }
      },
      {
        key: 'occupier',
        label: 'Occupier',
        sortField: 'occupier.i',
        selector: row => {
          if (row.occupier?.i) {
            return row.occupier.i === crew?.i ? 'you' : row.occupier.i.toLocaleString();
          }
          return 'Unoccupied';
        }
      },
      {
        key: 'building',
        label: 'Building Type',
        sortField: 'building.type',
        selector: row => {
          if (row.building?.type) {
            return Capable.TYPES[row.building.type]?.name;
          }
          return null;
        }
      },
      {
        key: 'construction',
        label: 'Construction Status',
        sortField: 'construction.status',
        selector: row => {
          if (row.construction?.status) {
            return Construction.STATUSES[row.construction.status];
          }
          return null;
        }
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account]);
};

export default useColumns;