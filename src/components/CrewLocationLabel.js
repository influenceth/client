import formatters from '~/lib/formatters';
import { LocationIcon } from './Icons';
import styled from 'styled-components';

const Wrapper = styled.div`
  color: white;
  font-size: 14.5px;
  text-transform: none;
  span {
    color: #AAA;
    &:before {
      content: " > ";
    }
  }

  svg {
    margin-right: 2px;
    vertical-align: middle;
  }

  ${p => p.onClick && `
    cursor: ${p.theme.cursors.active};
    &:hover, &:hover span {
      color: ${p.theme.colors.main};
    }
  `}
`;


const UnwrappedCrewLocationLabel = ({ flipIcon, hydratedLocation }) => {
  return (
    <>      
      {!flipIcon && <label><LocationIcon /></label>}
      {hydratedLocation.asteroid ? formatters.asteroidName(hydratedLocation.asteroid) : 'In Flight'}
      {(() => {
        const { ship, building, lotIndex } = hydratedLocation;
        if (ship) return <span>{formatters.shipName(ship)}</span>;
        if (building) return <span>{formatters.buildingName(building)}</span>;
        if (lotIndex) return <span>{formatters.lotName(lotIndex)}</span>;
        return <span>Escape Module</span>;
      })()}
      {flipIcon && <label><LocationIcon /></label>}
    </>
  );
};

const CrewLocationLabel = ({ onClick, style, ...otherProps }) => (
  <Wrapper onClick={onClick} style={style}>
    <UnwrappedCrewLocationLabel {...otherProps} />
  </Wrapper>
);

export default CrewLocationLabel;