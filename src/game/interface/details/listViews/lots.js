import { useMemo } from 'react';
import { Building } from '@influenceth/sdk';

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
          if (row.Control.controller?.id && row.Control.controller?.id === crew?.i) {
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
        // sortField: 'asteroid.i',
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          if (loc.asteroidId) {
            return (
              <>
                <LocationLink asteroidId={loc.asteroidId} />
                <span>{loc.asteroidId.toLocaleString()}</span>
              </>
            );
          }
          return null;
        }
      },
      {
        key: 'i',
        label: 'Lot Id',
        sortField: 'row.Location.location',
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          if (loc.asteroidId && loc.lotId) {
            return (
              <>
                <LocationLink asteroidId={loc.asteroidId} lotId={loc.lotId} />
                <span>{loc.lotId.toLocaleString()}</span>
              </>
            );
          }
          return null;
        },
        unhideable: true,
      },
      {
        key: 'controller',
        label: 'Controller',
        sortField: 'controller.id', // TODO: ecs refactor
        selector: row => {
          if (row.Control?.controller?.id) {
            return row.Control.controller.id === crew?.i ? 'you' : row.Control.controller.id.toLocaleString();
          }
          return 'Uncontrolled';
        }
      },
      {
        key: 'occupier',
        label: 'Occupier',
        // sortField: 'occupier.i',
        selector: row => {
          return 'TODO'; // TODO: ecs refactor
          // if (row.occupier?.i) {
          //   return row.occupier.i === crew?.i ? 'you' : row.occupier.i.toLocaleString();
          // }
          // return 'Unoccupied';
        }
      },
      {
        key: 'building',
        label: 'Building Type',
        sortField: 'building.type',
        selector: row => {
          // TODO: ecs refactor
          // if (row.building?.type) {
          //   return Building.TYPES[row.building.type]?.name;
          // }
          return null;
        }
      },
      {
        key: 'construction',
        label: 'Construction Status',
        sortField: 'construction.status',
        selector: row => {
          // TODO: ecs refactor
          // if (row.construction?.status) {
          //   return Building.CONSTRUCTION_STATUSES[row.construction.status];
          // }
          return null;
        }
      }
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account]);
};

export default useColumns;