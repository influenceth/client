import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Address } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import { MyAssetIcon } from '~/components/Icons';
import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import useStore from '~/hooks/useStore';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useAuth from '~/hooks/useAuth';
import theme from '~/theme';
import { HudMenuCollapsibleSection, majorBorderColor } from './components';

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

const AllAssets = ({ onClose }) => {
  const { account } = useAuth();
  const asteroidId = useStore(s => s.asteroids.origin);
  const selectAsteroid = useStore(s => s.dispatchOriginSelected);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const { data: ownedAsteroids } = useOwnedAsteroids();

  const [rendersReady, setRendersReady] = useState(0);

  const onClick = useCallback((i) => () => {
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
          titleText="My Ship"
          collapsed>
          
        </HudMenuCollapsibleSection>
        
        <HudMenuCollapsibleSection titleText="Asteroids" borderless>
          {(ownedAsteroids || []).map((asteroid, i) => (
            <SelectableRow key={asteroid.i} selected={asteroidId === asteroid.i} onClick={onClick(asteroid.i)}>
              <Thumbnail>
                {asteroid.owner && Address.areEqual(account, asteroid.owner) && <MyAssetWrapper><MyAssetIcon /></MyAssetWrapper>}
                {rendersReady >= i && <AsteroidRendering asteroid={asteroid} onReady={onRenderReady} />}
                <ClipCorner dimension={10} color={majorBorderColor} />
              </Thumbnail>
              <Info>
                <label>{asteroid.customName || asteroid.baseName}</label>
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