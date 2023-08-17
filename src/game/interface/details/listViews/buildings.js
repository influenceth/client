import { useMemo } from 'react';
import { Building, Location } from '@influenceth/sdk';

import { MyAssetIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import { LocationLink } from './components';

const useColumns = () => {
  const { account } = useAuth();
  const { crew } = useCrewContext();

  return useMemo(() => {
    const columns = [
      { // TODO: implement this per agreements/ownership
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => row.Control?.controller?.id === crew?.i ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        label: 'Building Type',
        sortField: 'Building.buildingType',
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          return (
            <>
              <LocationLink asteroidId={loc.asteroidId} lotId={loc.lotId} zoomToLot />
              <span>{Building.TYPES[row.Building.buildingType].name}</span>
            </>
          );
        },
        unhideable: true
      },
      {
        key: 'asteroid',
        label: 'Asteroid',
        sortField: 'meta.location[0].id', // TODO: will this work? does sequential sorting matter?
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          return (
            <>
              <LocationLink asteroidId={loc.asteroidId} />
              <span>{loc.asteroidId ? loc.asteroidId.toLocaleString() : null}</span>
            </>
          );
        },
      },
      {
        key: 'lot',
        label: 'Lot',
        sortField: 'meta.location[1].id', // TODO: will this work? does sequential sorting matter?
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          return (
            <>
              <LocationLink asteroidId={loc.asteroidId} lotId={loc.lotId} />
              <span>{loc.lotId ? loc.lotId.toLocaleString() : null}</span>
            </>
          );
        },
      },
      {
        key: 'controller',
        label: 'Lot Controller',
        sortField: 'Control.controller.id',
        selector: row => {
          if (row.Control?.controller?.id) {
            return row.Control?.controller?.id === crew?.i ? 'you' : row.Control?.controller?.id.toLocaleString();
          }
          return 'Uncontrolled';
        }
      },
      {
        key: 'occupier',
        label: 'Lot Occupier',
        // sortField: 'lot.occupier.i',
        selector: row => {
          return 'TODO'; // TODO: ecs refactor
          // if (row.lot?.occupier?.i) {
          //   return row.lot.occupier.i === crew?.i ? 'you' : row.lot.occupier.i.toLocaleString();
          // }
          // return 'Unoccupied';
        }
      },
      {
        key: 'occupation',
        label: 'Occupation Type',
        selector: row => {
          return 'TODO';  // TODO: ecs refactor
          // return row.lot?.occupier?.isSquatter ? 'Squatting' : (row.lot?.controller?.isRenter ? 'Renting' : '');
        },
      },
      {
        key: 'construction',
        label: 'Construction Status',
        sortField: 'Building.status',
        selector: row => {
          if (row.Building?.status) {
            return Building.CONSTRUCTION_STATUSES[row.Building.status];
          }
          return null;
        }
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crew?.i]);
};

export default useColumns;