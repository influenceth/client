import formatters from '~/lib/formatters';
import { LocationIcon, ShipIcon } from './Icons';
import styled from 'styled-components';
import { useCallback, useMemo } from 'react';
import EntityName from './EntityName';
import useHydratedLocation from '~/hooks/useHydratedLocation';

const hoverableHeight = 18;
const Hoverable = styled.div`
  color: white;
  height: ${hoverableHeight}px;
  overflow: hidden;
  text-align: right;
  & > div {
    height: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    white-space: nowrap;
  }
`;

const Wrapper = styled.div`
  align-items: center;
  color: ${p => p.status ? (p.status === 'In Flight' ? '#fab040' : p.theme.colors.main) : 'white'};
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: ${p => p.flip ? 'row-reverse' : 'row'};
  font-size: 15px;
  height: 24px;
  & > svg {
    font-size: 22px;
    line-height: 22px;
  }

  & ${Hoverable} > div {
    transform: translateY(${p => p.defaultToSpecific ? -hoverableHeight : 0}px);
    transition: transform 150ms ease;
  }
  &:hover {
    opacity: 0.9;
    ${Hoverable} > div {
      transform: translateY(${p => p.defaultToSpecific ? 0 : -hoverableHeight}px);
    }
  }
`;

const CrewLocationCompactLabel = ({ crew, zoomedToAsteroid, ...props }) => {
  const { asteroid, building, lotIndex, onLink, ship } = useHydratedLocation(crew?._location, crew?.id);

  const genericLabel = useMemo(() => {
    if (asteroid) return formatters.asteroidName(asteroid);
    if (ship) return <EntityName {...ship.Ship.transitDestination} />;
    if (crew?.Ship?.transitDestination) return <EntityName {...crew.Ship.transitDestination} />;
    return '';
  }, [asteroid, crew, ship]);

  const specificLabel = useMemo(() => {
    if (ship) return formatters.shipName(ship);
    if (building) return formatters.buildingName(building);
    return 'Escape Module';
  }, [ship, building]);

  const status = useMemo(() => {
    if (ship && building) return 'Docked';
    if (!lotIndex && (ship || crew).Ship?.transitDestination) return 'In Flight';
    if (!lotIndex && !(ship || crew).Ship?.transitDestination) return 'In Orbit';
    return '';
  }, [building, crew, lotIndex, ship]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onLink();
  }, [onLink]);

  return (
    <Wrapper
      onClick={handleClick}
      defaultToSpecific={zoomedToAsteroid === asteroid?.id}
      status={status}
      {...props}>
      {(ship || !building) ? <ShipIcon /> : <LocationIcon />}
      {status && (
        <>
          <div style={{ width: 5 }} />
          <div>({status})</div>
        </>
      )}
      <div style={{ width: 5 }} />
      <Hoverable>
        <div>{genericLabel}</div>
        <div>{specificLabel}</div>
      </Hoverable>
    </Wrapper>
  );
};

export default CrewLocationCompactLabel;