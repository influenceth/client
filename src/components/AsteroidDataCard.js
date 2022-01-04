import styled from 'styled-components';

import useSale from '~/hooks/useSale';
import DataReadout from '~/components/DataReadout';
import BonusBadge from '~/components/BonusBadge';
import AddressLink from '~/components/AddressLink';
import Ether from '~/components/Ether';
import formatters from '~/lib/formatters';

const Bonuses = styled.div`
  align-items: center;
  display: flex;
  height: 40px;
  margin-top: 5px;
`;

const LongTextWrap = styled.span`
  text-overflow: ellipsis;
  max-width: 100px;
  overflow: hidden;
  vertical-align: top;
  white-space: nowrap;
  @media (min-width: ${p => p.theme.breakpoints.xl}px) {
    max-width: 250px;
  }
`;

const AsteroidDataCard = (props) => {
  const { asteroid, ...restProps } = props;
  const { data: sale } = useSale();

  return (
    <div {...restProps}>
      {asteroid && (
        <>
          <DataReadout label="Asteroid Id" copyable={asteroid.i}>{asteroid.i}</DataReadout>
          <DataReadout label="Current Owner">
            <LongTextWrap>
              <AddressLink address={asteroid.owner} />
            </LongTextWrap>
          </DataReadout>
          {!!sale && !asteroid.owner && (
            <DataReadout label="Price">
              <span>{formatters.asteroidPrice(asteroid.r, sale)} <Ether /></span>
            </DataReadout>
          )}
          <DataReadout label="Spectral Type">{formatters.spectralType(asteroid.spectralType)}</DataReadout>
          <DataReadout label="Radius" copyable={asteroid.radius}>{formatters.radius(asteroid.radius)}</DataReadout>
          <DataReadout label="Surface Area">{formatters.surfaceArea(asteroid.radius)}</DataReadout>
          <DataReadout
            label="Orbital Period"
            copyable={asteroid.orbital.a}>
            {formatters.period(asteroid.orbital.a)}
          </DataReadout>
          <DataReadout
            label="Semi-major Axis"
            copyable={asteroid.orbital.a}>
            {formatters.axis(asteroid.orbital.a)}
          </DataReadout>
          <DataReadout
            label="Inclination"
            copyable={asteroid.orbital.i * 180 / Math.PI}>
            {formatters.inclination(asteroid.orbital.i)}
          </DataReadout>
          <DataReadout label="Eccentricity" copyable={asteroid.orbital.e}>{asteroid.orbital.e}</DataReadout>
          {asteroid.bonuses?.length > 0 && (
            <Bonuses>
              {asteroid.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
            </Bonuses>
          )}
        </>
      )}
    </div>
  );
};

export default AsteroidDataCard;
