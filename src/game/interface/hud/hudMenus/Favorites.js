import { useCallback } from 'react';
import styled from 'styled-components';
import { Address, toSize, toSpectralType } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import { MyAssetIcon } from '~/components/Icons';
import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import useStore from '~/hooks/useStore';
import useWatchlist from '~/hooks/useWatchlist';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useAuth from '~/hooks/useAuth';
import theme from '~/theme';
import { HudMenuCollapsibleSection, Scrollable } from './components';

const thumbnailDimension = 75;

const Thumbnail = styled.div`
  background: black;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
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
      clip-path: polygon(
        0 0,
        100% 0,
        100% calc(100% - 10px),
        calc(100% - 10px) 100%,
        0 100%
      );
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
  const { account } = useAuth();
  const asteroidId = useStore(s => s.asteroids.origin);
  const selectAsteroid = useStore(s => s.dispatchOriginSelected);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const { data: ownedAsteroids } = useOwnedAsteroids(); // TODO: remove this
  const { watchlist: { data: watchlist }} = useWatchlist();

  const onClick = useCallback((i) => () => {
    if (asteroidId === i) {
      updateZoomStatus('zooming-in');
      onClose();
    } else {
      selectAsteroid(i)
    }
  }, [asteroidId]);

  return (
    <Scrollable>
      <HudMenuCollapsibleSection titleText="Asteroids">
        <div>
          {([...(ownedAsteroids || []), ...(watchlist || []).map(w => w.asteroid)]).map((asteroid) => (
            <SelectableRow key={asteroid.i} selected={asteroidId === asteroid.i} onClick={onClick(asteroid.i)}>
              {asteroidId === asteroid.i && (
                <Thumbnail>
                  {asteroid.owner && Address.areEqual(account, asteroid.owner) && <MyAssetIcon />}
                  <AsteroidRendering asteroid={asteroid} />
                </Thumbnail>
              )}
              <label>{asteroid.customName || asteroid.baseName}</label>
              <span>
                {toSize(asteroid.r)}{' '}
                <b>{toSpectralType(asteroid.spectralType)}{'-type'}</b>
              </span>
              {asteroidId === asteroid.i && <ClipCorner dimension={10} color={theme.colors.main} />}
            </SelectableRow>
          ))}
        </div>
      </HudMenuCollapsibleSection>
    </Scrollable>
  );
};

export default Favorites;