import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Inventory } from '@influenceth/sdk';

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
        selector: row => row.owner === crew?.i ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'resource',
        label: 'Deposit',
        sortField: 'resource',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroid?.i} plotId={row.lot?.i} resourceId={row.resource} zoomToPlot="Resources" />
            <span>{Inventory.RESOURCES[row.resource]?.name}</span>
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
            <LocationLink asteroidId={row.asteroid?.i} resourceId={row.resource} />
            <span>{row.asteroid?.i.toLocaleString()}</span>
          </>
        ),
      },
      {
        key: 'lot',
        label: 'Lot',
        sortField: 'lot.i',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroid?.i} plotId={row.lot?.i} resourceId={row.resource} />
            <span>{row.lot?.i.toLocaleString()}</span>
          </>
        ),
      },
      {
        key: 'remainingYield',
        label: 'Amount',
        sortField: 'remainingYield',
        selector: row => {
          if (row.initialYield === undefined) {
            return `(incomplete)`;
          }
          else if (row.initialYield > row.remainingYield) {
            return (
              <>
                {formatFixed(row.remainingYield / 1e3, 0)} t
                <small style={{ marginLeft: 5 }}>(original {formatFixed(row.initialYield / 1e3, 0)} t)</small>
              </>
            );
          }
          return `${formatFixed(row.remainingYield / 1e3, 0)} t`;
        },
      },
      {
        key: 'forSale',
        label: 'For Sale',
        sortField: 'forSale',
        selector: row => row.forSale ? '(TODO: price)' : 'No',  // TODO: ...
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crew?.i]);
};

export default useColumns;