import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import utils from 'influence-utils';
import { KeplerianOrbit } from 'influence-utils';
import { IoIosPin } from 'react-icons/io';
import { RiZoomInFill, RiPagesFill } from 'react-icons/ri';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import BonusBadge from '~/components/BonusBadge';
import formatters from '~/lib/formatters';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 20px;
`;

const AsteroidData = styled.div`
  overflow-y: scroll;
`;

const Bonuses = styled.div`
  align-items: center;
  display: flex;
  height: 40px;
`;

const SelectedAsteroid = (props) => {
  const { asteroidId } = props;
  const asteroid = useAsteroid(asteroidId);
  const history = useHistory();
  const clearOrigin = useStore(state => state.dispatchOriginCleared);

  return (
    <Section
      name="selectedAsteroid"
      title={asteroid.data ? `${asteroid.data.name} Overview` : 'Loading...'}
      icon={<IoIosPin />}
      onClose={() => clearOrigin()}>
      {asteroid.data && (
        <Controls>
          <IconButton
            data-tip="Details"
            onClick={() => history.push(`/asteroids/${asteroid.data.i}`)}>
            <RiPagesFill />
          </IconButton>
          <IconButton
            data-tip="Zoom to Asteroid">
            <RiZoomInFill />
          </IconButton>
        </Controls>
      )}
      {asteroid.data && (
        <AsteroidData>
          <DataReadout label="Current Owner" data={formatters.assetOwner(asteroid.data.owner)} />
          <DataReadout label="Spectral Type" data={formatters.spectralType(asteroid.data.spectralType)} />
          <DataReadout label="Radius" data={formatters.radius(asteroid.data.radius)} />
          <DataReadout label="Surface Area" data={formatters.surfaceArea(asteroid.data.radius)} />
          <DataReadout label="Orbital Period" data={formatters.period(asteroid.data.orbital.a)} />
          <DataReadout label="Semi-major Axis" data={formatters.axis(asteroid.data.orbital.a)} />
          <DataReadout label="Inclination" data={formatters.inclination(asteroid.data.orbital.i)} />
          {asteroid.data.bonuses?.length > 0 && (
            <Bonuses>
              {asteroid.data.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
            </Bonuses>
          )}
        </AsteroidData>
      )}
    </Section>
  );
};

export default SelectedAsteroid;
