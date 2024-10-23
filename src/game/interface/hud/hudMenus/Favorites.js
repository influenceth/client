import { useCallback } from 'react';
import styled from 'styled-components';
import { Asteroid } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import { MyAssetIcon } from '~/components/Icons';
import AsteroidRendering from '~/components/AsteroidRendering';
import useStore from '~/hooks/useStore';
import useWatchlist from '~/hooks/useWatchlist';
import theme from '~/theme';
import { HudMenuCollapsibleSection } from './components/components';
import formatters from '~/lib/formatters';
import useCrewContext from '~/hooks/useCrewContext';

const thumbnailDimension = 75;

const Thumbnail = styled.div`
  background: black;
  ${p => p.theme.clipCorner(10)};
  height: ${thumbnailDimension}px;
  margin-right: 8px;
  position: relative;
  width: ${thumbnailDimension}px;
  & > svg {
    position: absolute;
    top: 2px;
    left: 2px;
    color: white;
  }
`;

const SelectableRow = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #999;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 8px 2px;
  position: relative;
  width: 100%;
  & > label {
    flex: 1;
  }
  & > span {
    b {
      color: white;
      font-weight: normal;
    }
  }

  ${p => p.selected
    ? `
      border: 1px solid ${p.theme.colors.main};
      background: rgba(${p.theme.colors.mainRGB}, 0.2);
      ${p.theme.clipCorner(10)};
      padding: 4px 8px 4px 4px;
      & > label {
        color: white;
      }
    `
    : `
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `
  }
`;

const Favorites = ({ onClose }) => {
  const { accountCrewIds } = useCrewContext();
  const asteroidId = useStore(s => s.asteroids.origin);
  const selectAsteroid = useStore(s => s.dispatchOriginSelected);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const { watchlist: { data: watchlist } } = useWatchlist();

  const onClick = useCallback((id) => () => {
    if (asteroidId === id) {
      updateZoomStatus('zooming-in');
      onClose();
    } else {
      selectAsteroid(id)
    }
  }, [asteroidId]);

  return (
    <HudMenuCollapsibleSection titleText="Asteroids">
      {(watchlist || []).map(asteroid => (
        <SelectableRow key={asteroid.id} selected={asteroidId === asteroid.id} onClick={onClick(asteroid.id)}>
          {asteroidId === asteroid.id && (
            <Thumbnail>
              {accountCrewIds?.includes(asteroid.Control?.controller?.id) && <MyAssetIcon />}
              <AsteroidRendering asteroid={asteroid} />
            </Thumbnail>
          )}
          <label>{formatters.asteroidName(asteroid)}</label>
          <span>
            {Asteroid.Entity.getSize(asteroid)}{' '}
            <b>{Asteroid.Entity.getSpectralType(asteroid)}{'-type'}</b>
          </span>
          {asteroidId === asteroid.id && <ClipCorner dimension={10} color={theme.colors.main} />}
        </SelectableRow>
      ))}
    </HudMenuCollapsibleSection>
  );
};

export default Favorites;