import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import utils from 'influence-utils';
import { KeplerianOrbit } from 'influence-utils';
import { GiAsteroid } from 'react-icons/gi';
import { RiZoomInFill, RiPagesFill } from 'react-icons/ri';

import useStore from '~/hooks/useStore';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import BonusBadge from '~/components/BonusBadge';
import constants from '~/constants';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 20px;
`;

const Bonuses = styled.div`
  align-items: center;
  display: flex;
  height: 40px;
`;

const Asteroid = (props) => {
  const { asteroid } = props;
  const history = useHistory();
  const deselectOrigin = useStore(state => state.deselectOrigin);

  const orbit = new KeplerianOrbit(asteroid.orbital);
  const surfaceArea = (4 * Math.PI * Math.pow(asteroid.radius / 1000, 2)).toFixed(1);
  const period = orbit.getPeriod().toFixed(0).toLocaleString();
  const inclination = asteroid.orbital.i * 180 / Math.PI;

  let owner = 'Un-owned';

  if (asteroid.owner) {
    owner = (
      <a target="_blank" rel="noreferrer" href={`${process.env.REACT_APP_OPEN_SEA_URL}/accounts/${asteroid.owner}`}>
        {asteroid.owner}
      </a>
    );
  }

  return (
    <Section
      name="asteroid"
      title={asteroid.name}
      icon={<GiAsteroid />}
      onClose={() => deselectOrigin()}>
      <Controls>
        <IconButton
          data-tip="Details"
          onClick={() => history.push(`/asteroids/${asteroid.i}`)}>
          <RiPagesFill />
        </IconButton>
        <IconButton
          data-tip="Zoom to Asteroid">
          <RiZoomInFill />
        </IconButton>
      </Controls>
      <DataReadout label="Current Owner" data={owner} />
      <DataReadout label="Spectral Type" data={`${utils.toSpectralType(asteroid.spectralType)}-type`} />
      <DataReadout label="Radius" data={`${asteroid.radius.toLocaleString()} m`} />
      <DataReadout label="Surface Area" data={`${Number(surfaceArea).toLocaleString()} km²`} />
      <DataReadout label="Orbital Period" data={`${period} days`} />
      <DataReadout label="Semi-major Axis" data={`${asteroid.orbital.a.toLocaleString()} AU`} />
      <DataReadout label="Inclination" data={`${inclination.toLocaleString()}°`} />
      {asteroid.bonuses?.length > 0 && (
        <Bonuses>
          {asteroid.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
        </Bonuses>
      )}
    </Section>
  );
};

export default Asteroid;
