import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { IoIosPin } from 'react-icons/io';
import { RiZoomInFill as ZoomInIcon, RiZoomOutFill as ZoomOutIcon } from 'react-icons/ri';
import { AiFillEye as WatchIcon } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import useAsteroid from '~/hooks/useAsteroid';
import useWatchAsteroid from '~/hooks/useWatchAsteroid';
import useUnWatchAsteroid from '~/hooks/useUnWatchAsteroid';
import useWatchlist from '~/hooks/useWatchlist';
import AsteroidCrewPlotsCard from '~/components/AsteroidCrewPlotsCard';
import AsteroidDataCard from '~/components/AsteroidDataCard';
import IconButton from '~/components/IconButton';
import { ConstructIcon, DetailIcon } from '~/components/Icons';
import Section from '~/components/Section';
import useCrewContext from '~/hooks/useCrewContext';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 15px;
  & svg {
    vertical-align: baseline;
  }
`;

const StyledAsteroidDataCard = styled(AsteroidDataCard)`
  overflow-y: auto;
  scrollbar-width: thin;
`;

const SelectedAsteroid = (props) => {
  const { asteroidId } = props;
  const history = useHistory();
  const { isMobile } = useScreenSize();

  const { data: asteroid } = useAsteroid(asteroidId);
  const { crew } = useCrewContext();
  const { ids: watchlistIds } = useWatchlist();
  const watchAsteroid = useWatchAsteroid();
  const unWatchAsteroid = useUnWatchAsteroid();

  const watchlistActive = useStore(s => s.outliner.watchlist.active);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const selectOrigin = useStore(s => s.dispatchOriginSelected);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const [ inWatchlist, setInWatchlist ] = useState(false);
  const [ showBuildings, setShowBuildings ] = useState(false);

  useEffect(() => {
    if (watchlistIds && asteroid) {
      setInWatchlist(watchlistIds.includes(asteroid.i));
    } else {
      setInWatchlist(false);
    }
  }, [ watchlistIds, asteroid ]);

  useEffect(() => {
    if (zoomStatus !== 'in' && showBuildings) {
      setShowBuildings(false);
    }
  }, [showBuildings, zoomStatus])

  const onClose = useCallback(() => {
    if (zoomStatus !== 'zooming-in') {
      selectOrigin();
      if (zoomStatus === 'in') {
        updateZoomStatus('zooming-out');
      }
    }
  }, [zoomStatus]);

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
      onClose={onClose}>
      {asteroid && (
        <Controls>
          {crew && zoomStatus === 'in' && (
            <IconButton
              data-tip={`${showBuildings ? 'Close' : 'List'} My Buildings`}
              active={showBuildings}
              onClick={() => setShowBuildings(!showBuildings)}>
              <ConstructIcon height="1em" width="1em" />
            </IconButton>
          )}
          <IconButton
            data-tip="Details"
            onClick={() => history.push(`/asteroids/${asteroid.i}`)}>
            <DetailIcon />
          </IconButton>
          {zoomStatus === 'out' && !isMobile && (
            <IconButton
              data-tip="Zoom to Asteroid"
              onClick={() => updateZoomStatus('zooming-in')}>
              <ZoomInIcon />
            </IconButton>
          )}
          {zoomStatus === 'in' && (
            <IconButton
              data-tip="Zoom Out to System"
              onClick={() => updateZoomStatus('zooming-out')}>
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
      {asteroid && !showBuildings && <StyledAsteroidDataCard asteroid={asteroid} />}
      {showBuildings && <AsteroidCrewPlotsCard asteroid={asteroid} />}
    </Section>
  );
};

export default SelectedAsteroid;
