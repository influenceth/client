import { useCallback, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Asteroid } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import AsteroidComposition from './AsteroidComposition';
import AsteroidRendering from '../../../../../components/AsteroidRendering';
import AsteroidSpinner from './AsteroidSpinner';
import formatters from '~/lib/formatters';
import { WarningOutlineIcon } from '~/components/Icons';
import theme from '~/theme';
import useScanManager from '~/hooks/useScanManager';

const OPACITY_ANIMATION = 400;

const Graphic = styled.div`
  padding-top: 100%;
  position: relative;
  width: 100%;
  & > * {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }
`;
const GraphicData = styled.div`
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  font-size: 20px;
  justify-content: center;
  & b {
    color: white;
  }
  & div {
    margin: 8px 0;
  }
  & div {
    text-transform: uppercase;
  }
`;

const OpacityContainer = styled.div`
  opacity: ${p => p.ready};
  transition: opacity ${OPACITY_ANIMATION}ms ease;
`;

const AsteroidName = styled.div`
  background: black;
  border: 1px solid ${p => p.theme.colors.borderBottom};
  border-radius: 1em;
  color: white;
  font-size: 28px;
  padding: 4px 12px;
  text-align: center;
  text-transform: none !important;
  min-width: 55%;
`;

const opacityKeyframes = keyframes`
  0% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.3;
  }
`;
const opacityAnimation = css`
  animation: ${opacityKeyframes} 1200ms ease-in-out infinite;
`;
const LastRow = styled.div`
  ${p => p.animate && opacityAnimation};
  text-align: center;
  text-transform: uppercase;
  & > svg {
    font-size: 36px;
    margin-bottom: -18px;
  }
`;

const AsteroidGraphic = ({ asteroid, defaultLastRow, ...compositionProps }) => {
  const saleIsActive = useStore(s => s.sale);
  const { scanStatus } = useScanManager(asteroid);

  const [ready, setReady] = useState();

  const onReady = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <Graphic>
      <OpacityContainer ready={ready ? 1 : 0}>
        {scanStatus === 'SCANNING' && (
          <AsteroidSpinner />
        )}
        {scanStatus !== 'SCANNING' && (
          <AsteroidComposition
            animationDelay={OPACITY_ANIMATION}
            asteroid={asteroid}
            ready={ready}
            {...compositionProps}
          />
        )}
      </OpacityContainer>
      <OpacityContainer ready={ready ? 1 : 0}>
        <AsteroidRendering asteroid={asteroid} onReady={onReady} />
      </OpacityContainer>
      <GraphicData>
        <div>
          {Asteroid.Entity.getSize(asteroid)} <b>{Asteroid.Entity.getSpectralType(asteroid)}-type</b>
        </div>
        <AsteroidName>
          {formatters.asteroidName(asteroid)}
        </AsteroidName>
        {scanStatus === 'FINISHED' && (
          <LastRow style={{ color: 'white' }}>
            {defaultLastRow || `${Asteroid.Entity.getSurfaceArea(asteroid).toLocaleString()} lots`}
          </LastRow>
        )}
        {scanStatus === 'SCANNING' && (
          <LastRow animate style={{ color: theme.colors.main, fontSize: '85%', fontWeight: 'bold' }}>
            Analyzing<br/>Resource Matrix...
          </LastRow>
        )}
        {scanStatus === 'READY_TO_FINISH' && (
          <LastRow style={{ color: theme.colors.success, fontSize: '85%', fontWeight: 'bold' }}>
            Resource<br/>Analysis Ready
          </LastRow>
        )}
        {scanStatus === 'UNSCANNED' && asteroid.Control?.controller && (
          <LastRow style={{ color: theme.colors.error }}>
            Un-Scanned<br/>
            <WarningOutlineIcon />
          </LastRow>
        )}
        {scanStatus === 'UNSCANNED' && !asteroid.Control?.controller && saleIsActive && (
          <LastRow style={{ color: '#55d0fa', fontWeight: 'bold' }}>
            Available<br/>for Purchase
          </LastRow>
        )}
        {scanStatus === 'UNSCANNED' && !asteroid.Control?.controller && !saleIsActive && (
          <LastRow>
            Unavailable
          </LastRow>
        )}
      </GraphicData>
    </Graphic>
  );
}

export default AsteroidGraphic;