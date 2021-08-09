import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { IoIosPin } from 'react-icons/io';
import { RiZoomInFill as ZoomInIcon, RiZoomOutFill as ZoomOutIcon, RiPagesFill } from 'react-icons/ri';
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
  padding-bottom: 15px;
`;

const AsteroidData = styled.div`
  overflow-y: scroll;
`;

const Bonuses = styled.div`
  align-items: center;
  display: flex;
  height: 40px;
  margin-top: 5px;
`;

const SelectedAsteroid = (props) => {
  const { asteroidId } = props;
  const history = useHistory();

  const { data: asteroid } = useAsteroid(asteroidId);
  const { ids: watchlistIds } = useWatchlist();
  const watchAsteroid = useWatchAsteroid();
  const unWatchAsteroid = useUnWatchAsteroid();

  const watchlistActive = useStore(state => state.outliner.watchlist.active);
  const zoomed = useStore(state => state.asteroids.zoomed);
  const clearOrigin = useStore(state => state.dispatchOriginCleared);
  const zoomIn = useStore(state => state.dispatchAsteroidZoomedIn);
  const zoomOut = useStore(state => state.dispatchAsteroidZoomedOut);

  const [ inWatchlist, setInWatchlist ] = useState(false);

  useEffect(() => {
    if (watchlistIds && asteroid) {
      setInWatchlist(watchlistIds.includes(asteroid.i));
    } else {
      setInWatchlist(false);
    }
  }, [ watchlistIds, asteroid ]);

  const title = () => {
    if (asteroid && asteroid.customName) return asteroid.customName;
    if (asteroid && asteroid.baseName) return asteroid.baseName;
    return '';
  };

  return (
    <Section
      name="selectedAsteroid"
      title={title()}
      icon={<IoIosPin />}
      onClose={() => clearOrigin()}>
      {asteroid && (
        <Controls>
          <IconButton
            data-tip="Details"
            onClick={() => history.push(`/asteroids/${asteroid.i}`)}>
            <RiPagesFill />
          </IconButton>
          {!zoomed && (
            <IconButton
              data-tip="Zoom to Asteroid"
              onClick={zoomIn}>
              <ZoomInIcon />
            </IconButton>
          )}
          {zoomed && (
            <IconButton
              data-tip="Zoom Out to System"
              onClick={zoomOut}>
              <ZoomOutIcon />
            </IconButton>
          )}
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
          <DataReadout label="Eccentricity" data={asteroid.orbital.e} />
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
