import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import BonusBadge from '~/components/BonusBadge';
import AddressLink from '~/components/AddressLink';
import formatters from '~/lib/formatters';

const Bonuses = styled.div`
  align-items: center;
  display: flex;
  height: 40px;
  margin-top: 5px;
`;

const AsteroidDataCard = (props) => {
  const { asteroid, ...restProps } = props;

  return (
    <div {...restProps}>
      <DataReadout label="Current Owner">
        {asteroid.owner ? <AddressLink address={asteroid.owner} /> : 'Un-owned'}
      </DataReadout>
      <DataReadout label="Spectral Type">{formatters.spectralType(asteroid.spectralType)}</DataReadout>
      <DataReadout label="Radius">{formatters.radius(asteroid.radius)}</DataReadout>
      <DataReadout label="Surface Area">{formatters.surfaceArea(asteroid.radius)}</DataReadout>
      <DataReadout label="Orbital Period">{formatters.period(asteroid.orbital.a)}</DataReadout>
      <DataReadout label="Semi-major Axis">{formatters.axis(asteroid.orbital.a)}</DataReadout>
      <DataReadout label="Inclination">{formatters.inclination(asteroid.orbital.i)}</DataReadout>
      <DataReadout label="Eccentricity">{asteroid.orbital.e}</DataReadout>
      {asteroid.bonuses?.length > 0 && (
        <Bonuses>
          {asteroid.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
        </Bonuses>
      )}
    </div>
  );
};

export default AsteroidDataCard;
