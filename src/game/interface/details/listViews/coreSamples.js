import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Location, Product } from '@influenceth/sdk';

import {
  CrewIcon,
  CrewmateIcon,
  MyAssetIcon,
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import { formatFixed } from '~/lib/utils';
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
        selector: row => row.Control?.controller?.id === crew?.i ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'resource',
        label: 'Deposit',
        sortField: 'resource',
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          return (
            <>
              <LocationLink asteroidId={loc.asteroidId} lotId={loc.lotId} resourceId={row.Deposit.resource} zoomToLot="LOT_RESOURCES" />
              <span>{Product.TYPES[row.Deposit.resource]?.name}</span>
            </>
          );
        },
        unhideable: true
      },
      {
        key: 'asteroid',
        label: 'Asteroid',
        sortField: 'asteroid.i',
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          return (
            <>
              <LocationLink asteroidId={loc.asteroidId} resourceId={row.Deposit.resource} />
              <span>{loc.asteroidId.toLocaleString()}</span>
            </>
          );
        },
      },
      {
        key: 'lot',
        label: 'Lot',
        sortField: 'lot.i',
        selector: row => {
          const loc = Location.fromEntityFormat(row.Location?.location);
          return (
            <>
              <LocationLink asteroidId={loc.asteroidId} lotId={loc.lotId} resourceId={row.Deposit.resource} />
              <span>{row.lotId.toLocaleString()}</span>
            </>
          );
        },
      },
      {
        key: 'remainingYield',
        label: 'Amount',
        sortField: 'remainingYield',
        selector: row => {
          if (row.Deposit.initialYield === undefined) {
            return `(incomplete)`;
          }
          else if (row.Deposit.initialYield > row.Deposit.remainingYield) {
            return (
              <>
                {formatFixed(row.Deposit.remainingYield / 1e3, 0)} t
                <small style={{ marginLeft: 5 }}>(original {formatFixed(row.Deposit.initialYield / 1e3, 0)} t)</small>
              </>
            );
          }
          return `${formatFixed(row.Deposit.remainingYield / 1e3, 0)} t`;
        },
      },
      {
        key: 'forSale',
        label: 'For Sale',
        sortField: 'forSale',
        selector: row => row.Deposit.forSale ? '(TODO: price)' : 'No', // TODO: ecs refactor
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crew?.i]);
};

export default useColumns;