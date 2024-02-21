import { useMemo } from 'react';
import { Entity, Lot, Ship } from '@influenceth/sdk';

import { MyAssetIcon, SwayIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import { LocationLink } from './components';
import formatters from '~/lib/formatters';
import { formatFixed, locationsArrToObj } from '~/lib/utils';
import EntityName from '~/components/EntityName';
import styled from 'styled-components';

const Me = styled.span`
  color: ${p => p.theme.colors.main};
  font-weight: bold;
  margin-left: 4px;
  &:after {
    content: '(Me)';
  }
`;

const useColumns = () => {
  const { account } = useAuth();
  const { crew } = useCrewContext();

  return useMemo(() => {
    const columns = [
      { // TODO: implement this per agreements/ownership
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => row.Control?.controller?.id === crew?.id ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        label: 'Name',
        sortField: 'Name.name.raw',
        selector: row => <span>{formatters.shipName(row)}</span>,
        unhideable: true
      },
      {
        key: 'type',
        label: 'Type',
        sortField: 'Ship.shipType',
        selector: row => (
          <span>{Ship.TYPES[row.Ship?.shipType]?.name}</span>
        ),
        unhideable: true
      },
      {
        key: 'status',
        label: 'Status',
        sortField: 'Location.location.label',
        selector: row => {
          const loc = locationsArrToObj(row.Location?.locations || []);
          if (loc.buildingId) return 'Docked';
          if (loc.lotId) return 'Landed';
          if (loc.asteroidId) return 'In Orbit';
          if (loc.spaceId) return 'In Flight';
          return '';
        },
      },
      {
        key: 'asteroid',
        label: 'Asteroid',
        sortField: 'meta.asteroid.name.raw',
        selector: row => {
          const loc = locationsArrToObj(row.Location?.locations || []);
          if (loc.asteroidId) {
            return (
              <>
                <LocationLink lotId={loc.asteroidId} />
                <span>{row.meta.asteroid.name || formatters.asteroidName({ id: loc.asteroidId })}</span>
              </>
            );
          }
          return null;
        },
      },
      {
        key: 'lot',
        label: 'Lot',
        selector: row => {
          const loc = locationsArrToObj(row.Location?.locations || []);
          if (loc.lotId) {
            return (
              <>
                <LocationLink lotId={loc.lotId} />
                <span>{loc.buildingId ? <EntityName label={Entity.IDS.BUILDING} id={loc.buildingId} /> : formatters.lotName(loc.lotId)}</span>
              </>
            );
          }
          return null;
        },
      },
      {
        key: 'crew',
        label: 'Flight Crew',
        sortField: 'meta.crew.name.raw',
        selector: row => {
          if (row.Control?.controller?.id) {
            return (
              <>
                {row.meta.crew.name || <EntityName {...row.Control.controller} />}
                {row.Control?.controller?.id === crew?.id && <Me />}
              </>
            );
          }
          return null;
        }
      },
      {
        key: 'price',
        label: 'Sale Price',
        sortField: 'Nft.price',
        selector: row => {
          if (row.Nft?.price > 0) {
            return <><SwayIcon /> {formatFixed(row.Nft.price / 1e6)}</>
          }
          return null;
        }
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crew?.id]);
};

export default useColumns;