import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Address } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import { MyAssetIcon } from '~/components/Icons';
import AsteroidRendering from '~/components/AsteroidRendering';
import useStore from '~/hooks/useStore';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useOwnedShips from '~/hooks/useOwnedShips';
import useAuth from '~/hooks/useAuth';
import theme from '~/theme';
import { HudMenuCollapsibleSection, majorBorderColor } from './components';
import { useShipLink } from '~/components/ShipLink';
import { ResourceImage } from '~/components/ResourceThumbnail';
import { getShipIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';

const thumbnailDimension = 75;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  max-height: 100%;
`;

const MyAssetWrapper = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  color: white;
`;

const Thumbnail = styled.div`
  background: black;
  border: 1px solid ${majorBorderColor};
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
`;

const SelectableRow = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #999;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 8px 4px;
  position: relative;
  width: 100%;

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
      margin: 4px 0;
      padding: 4px 8px 4px 4px;
    `
    : `
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `
  }
`;

const Info = styled.div`
  align-self: stretch;
  display: flex;
  flex: 1;
  flex-direction: column;
  
  & > label {
    color: white;
    font-size: 17px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  & > div {
    border-top: 1px solid ${majorBorderColor};
    margin-top: 8px;
    padding-top: 8px;
  }
`;

const ShipRow = ({ ship }) => {
  const onClickShip = useShipLink({ shipId: ship.i, zoomToShip: true })
  return (
    <SelectableRow onClick={onClickShip}>
      <Thumbnail>
        <MyAssetWrapper><MyAssetIcon /></MyAssetWrapper>
        <ResourceImage src={getShipIcon(ship.Ship.shipType, 'w150')} contain />
        <ClipCorner dimension={10} color={majorBorderColor} />
      </Thumbnail>
      <Info>
        <label>{ship.Name?.name || `Ship #${ship.i.toLocaleString()}`}</label>
        <div style={{ flex: 1 }}></div>
      </Info>
    </SelectableRow>
  );
};

const AllAssets = ({ onClose }) => {
  const { crew } = useCrewContext();

  const asteroidId = useStore(s => s.asteroids.origin);
  const selectAsteroid = useStore(s => s.dispatchOriginSelected);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const { data: ownedAsteroids } = useOwnedAsteroids();
  const { data: ownedShips } = useOwnedShips();

  const [rendersReady, setRendersReady] = useState(0);

  const onClickAsteroid = useCallback((i) => () => {
    if (asteroidId === i) {
      updateZoomStatus('zooming-in');
      onClose();
    } else {
      selectAsteroid(i)
    }
  }, [asteroidId]);

  const onRenderReady = useCallback(() => {
    setRendersReady((r) => r + 1);
  }, []);

  return (
    <Wrapper>
      
        <HudMenuCollapsibleSection
          titleText={`Ships`}
          collapsed>
          {(ownedShips || []).map((ship) => <ShipRow key={ship.i} ship={ship} />)}
        </HudMenuCollapsibleSection>
        
        <HudMenuCollapsibleSection
          titleText={`Asteroids`}
          borderless>
          {(ownedAsteroids || []).map((asteroid, i) => (
            <SelectableRow key={asteroid.i} selected={asteroidId === asteroid.i} onClick={onClickAsteroid(asteroid.i)}>
              <Thumbnail>
                {asteroid.Control?.controller?.id === crew?.i && <MyAssetWrapper><MyAssetIcon /></MyAssetWrapper>}
                {rendersReady >= i && <AsteroidRendering asteroid={asteroid} onReady={onRenderReady} />}
                <ClipCorner dimension={10} color={majorBorderColor} />
              </Thumbnail>
              <Info>
                <label>{formatters.asteroidName(asteroid)}</label>
                <div style={{ flex: 1 }}></div>
              </Info>
              {asteroidId === asteroid.i && <ClipCorner dimension={10} color={theme.colors.main} />}
            </SelectableRow>
          ))}
        </HudMenuCollapsibleSection>
        
      
    </Wrapper>

  );
};

export default AllAssets;