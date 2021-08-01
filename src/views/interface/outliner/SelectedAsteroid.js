import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import utils from 'influence-utils';
import { KeplerianOrbit } from 'influence-utils';
import { GiAsteroid } from 'react-icons/gi';
import { RiZoomInFill, RiPagesFill } from 'react-icons/ri';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import BonusBadge from '~/components/BonusBadge';
import constants from '~/constants';

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

  const period = (a) => {
    const orbit = new KeplerianOrbit(a.orbital);
    return orbit.getPeriod().toFixed(0).toLocaleString() + ' days';
  };

  const surfaceArea = (a) => {
    const area = (4 * Math.PI * Math.pow(asteroid.radius / 1000, 2)).toFixed(1);
    return Number(area).toLocaleString() + ' km²';
  };

  const inclination = (a) => (a.orbital.i * 180 / Math.PI).toLocaleString() + '°';

  const owner = (a) => {
    if (a.owner) {
      const url = `${process.env.REACT_APP_OPEN_SEA_URL}/accounts/${a.owner}`;
      return <a target="_blank" rel="noreferrer" href={url}>{a.owner}</a>;
    } else {
      return 'Un-owned';
    }
  };

  return (
    <Section
      name="selectedAsteroid"
      title={asteroid.data ? asteroid.data.name : 'Loading...'}
      icon={<GiAsteroid />}
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
          <DataReadout label="Current Owner" data={owner(asteroid.data)} />
          <DataReadout label="Spectral Type" data={`${utils.toSpectralType(asteroid.data.spectralType)}-type`} />
          <DataReadout label="Radius" data={`${asteroid.data.radius.toLocaleString()} m`} />
          <DataReadout label="Surface Area" data={surfaceArea(asteroid.data)} />
          <DataReadout label="Orbital Period" data={period(asteroid.data)} />
          <DataReadout label="Semi-major Axis" data={`${asteroid.data.orbital.a.toLocaleString()} AU`} />
          <DataReadout label="Inclination" data={inclination(asteroid.data)} />
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
