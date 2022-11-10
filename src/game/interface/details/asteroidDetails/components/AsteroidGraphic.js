import { useCallback, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import utils from 'influence-utils';

import useStore from '~/hooks/useStore';
import AsteroidComposition from './AsteroidComposition';
import AsteroidRendering from './AsteroidRendering';
import AsteroidSpinner from './AsteroidSpinner';
import { WarningOutlineIcon } from '~/components/Icons';
import theme from '~/theme';

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

  const [ready, setReady] = useState();

  const onReady = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <Graphic>
      <OpacityContainer ready={ready ? 1 : 0}>
        {asteroid.scanStatus === 'SCANNING' && (
          <AsteroidSpinner />
        )}
        {asteroid.scanStatus !== 'SCANNING' && (
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
          {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
        </div>
        <AsteroidName>
          {asteroid.customName ? `\`${asteroid.customName}\`` : asteroid.baseName}
        </AsteroidName>
        {asteroid.scanned && (
          <LastRow style={{ color: 'white' }}>
            {defaultLastRow || `${Number(Math.floor(4 * Math.PI * Math.pow(asteroid.radius / 1000, 2))).toLocaleString()} lots`}
          </LastRow>
        )}
        {!asteroid.scanned && asteroid.scanStatus === 'SCANNING' && (
          <LastRow animate style={{ color: theme.colors.main, fontSize: '85%', fontWeight: 'bold' }}>
            Analyzing<br/>Resource Matrix...
          </LastRow>
        )}
        {!asteroid.scanned && asteroid.scanStatus === 'SCAN_READY' && (
          <LastRow style={{ color: theme.colors.success, fontSize: '85%', fontWeight: 'bold' }}>
            Resource<br/>Analysis Ready
          </LastRow>
        )}
        {!asteroid.scanned && asteroid.scanStatus === 'UNSCANNED' && asteroid.owner && (
          <LastRow style={{ color: theme.colors.error }}>
            Un-Scanned<br/>
            <WarningOutlineIcon />
          </LastRow>
        )}
        {!asteroid.scanned && asteroid.scanStatus === 'UNSCANNED' && !asteroid.owner && saleIsActive && (
          <LastRow style={{ color: '#55d0fa', fontWeight: 'bold' }}>
            Available<br/>for Purchase
          </LastRow>
        )}
        {!asteroid.scanned && asteroid.scanStatus === 'UNSCANNED' && !asteroid.owner && !saleIsActive && (
          <LastRow>
            Unavailable
          </LastRow>
        )}
      </GraphicData>
    </Graphic>
  );
}

export default AsteroidGraphic;