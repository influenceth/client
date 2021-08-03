import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { IoIosPin } from 'react-icons/io';
import { RiZoomInFill, RiPagesFill } from 'react-icons/ri';
import { AiFillEye as WatchIcon } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import useWatchAsteroid from '~/hooks/useWatchAsteroid';
import useUnWatchAsteroid from '~/hooks/useUnWatchAsteroid';
import useWatchlist from '~/hooks/useWatchlist';
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
  const { data: asteroid } = useAsteroid(asteroidId);
  const { watchlist: { data: watchlist }, ids: watchlistIds } = useWatchlist();
  const history = useHistory();
  const clearOrigin = useStore(state => state.dispatchOriginCleared);
  const watchlistActive = useStore(state => state.outliner.watchlist.active);
  const watchAsteroid = useWatchAsteroid();
  const unWatchAsteroid = useUnWatchAsteroid();
  const [ inWatchlist, setInWatchlist ] = useState(false);

  useEffect(() => {
    if (watchlistIds && asteroid) {
      setInWatchlist(watchlistIds.includes(asteroid.i));
    } else {
      setInWatchlist(false);
    }
  }, [ watchlistIds, asteroid ])

  return (
    <Section
      name="selectedAsteroid"
      title={asteroid ? `${asteroid.name} Overview` : ''}
      icon={<IoIosPin />}
      onClose={() => clearOrigin()}>
      {asteroid && (
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
          {watchlistActive && (
            <IconButton
              data-tip={inWatchlist ? 'Un-watch Asteroid' : 'Watch Asteroid'}
              onClick={() => inWatchlist ? unWatchAsteroid.mutate(asteroid.i) : watchAsteroid.mutate(asteroid.i)}
              active={inWatchlist}>
              <WatchIcon />
            </IconButton>
          )}
        </Controls>
      )}
      {asteroid && (
        <AsteroidData>
          <DataReadout label="Current Owner" data={formatters.assetOwner(asteroid.owner)} />
          <DataReadout label="Spectral Type" data={formatters.spectralType(asteroid.spectralType)} />
          <DataReadout label="Radius" data={formatters.radius(asteroid.radius)} />
          <DataReadout label="Surface Area" data={formatters.surfaceArea(asteroid.radius)} />
          <DataReadout label="Orbital Period" data={formatters.period(asteroid.orbital.a)} />
          <DataReadout label="Semi-major Axis" data={formatters.axis(asteroid.orbital.a)} />
          <DataReadout label="Inclination" data={formatters.inclination(asteroid.orbital.i)} />
          {asteroid.bonuses?.length > 0 && (
            <Bonuses>
              {asteroid.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
            </Bonuses>
          )}
        </AsteroidData>
      )}
    </Section>
  );
};

export default SelectedAsteroid;
