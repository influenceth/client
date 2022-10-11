import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import utils, { Address } from 'influence-utils';

import beltImageSrc from '~/assets/images/belt.jpg';
import Button from '~/components/ButtonAlt';
import { BackIcon, InfoIcon, CompositionIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import TabContainer from '~/components/TabContainer';
import ResourceMapSelector from './sceneMenu/ResourceMapSelector';

const leftPadding = `52px`;

const Pane = styled.div`
  opacity: ${p => p.visible ? 1 : 0};
  overflow: hidden;
  padding: 0 0 140px ${leftPadding};
  position: absolute;
  bottom: 0;
  left: 0;
  transition: opacity 750ms ease;
  width: 500px;
`;

const Title = styled.div`
  color: white;
  font-size: 50px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Subtitle = styled.div`
  color: #999;
  font-size: 18px;
  margin-bottom: 16px;
  & b {
    color: white;
  }
`;
const ExtraInfo = styled.div`
  color: #AAA;
  font-size: 15px;
  padding-top: 24px;
  padding-bottom: 16px;
  & > b {
    color: ${p => p.theme.colors.main};
  }
`;

const backButtonImageDim = 75;
const backButtonPadding = 5;
const BeltImage = styled.img`
  margin: ${backButtonPadding}px;
  border: 1px solid ${p => p.theme.colors.borderBottomAlt};
  background: black url('${beltImageSrc}');
  background-position: center center;
  background-size: contain;
  width: ${backButtonImageDim}px;
  height: ${backButtonImageDim}px;
  transition: border 250ms ease, outline 250ms ease;
`;

const BackButton = styled.div`
  align-items: center;
  border-left: 4px solid ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: ${backButtonImageDim + 2 * backButtonPadding}px;
  margin-left: -${leftPadding};
  margin-bottom: 75px;
  pointer-events: all;
  transition: color 250ms ease;
  width: 240px;
  & > div {
    align-items: center;
    background-color: #111;
    display: flex;
    flex-direction: row;
    font-size: 24px;
    transition: background-color 150ms ease;
    & > span {
      padding: 0 10px 0 5px;
    }
  }
  & > span:last-child {
    font-weight: bold;
    padding-left: 10px;
  }

  &:hover {
    color: white;
    & > div {
      background-color: #222;
    }
    & ${BeltImage} {
      border-color: white;
      outline: 1px solid white;
    }
  }
`;


const SceneMenu = (props) => {
  const { account } = useAuth();
  const origin = useStore(s => s.asteroids.origin);
  const sceneMod = useStore(s => s.asteroids.sceneMod);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const history = useHistory();

  const [activeTab, setActiveTab] = useState(sceneMod?.type === 'resourceMap' ? 1 : 0);

  const { data: asteroid } = useAsteroid(origin);

  // TODO: on heatmap selection, update store so back button works as expected?

  const onSetTab = useCallback((tabIndex) => {
    if (tabIndex === 0) {
      setActiveTab(0);
      history.push(`/asteroids/${asteroid.i}`);
    } else if (tabIndex === 1) {
      if (asteroid.scanned) {
        setActiveTab(1);
      } else {
        history.push(`/asteroids/${asteroid.i}/resources`);
      }
    }
  }, [asteroid?.i, asteroid?.scanned]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sceneMod?.type) {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [sceneMod?.type, sceneMod?.params])

  if (!asteroid) return null;
  return (
    <>
      <Pane visible={zoomStatus === 'in'}>
        <BackButton onClick={() => updateZoomStatus('zooming-out')}>
          <div>
            <span><BackIcon /></span>
            <BeltImage />
          </div>
          <span>Back to Belt</span>
        </BackButton>
        <Title>{asteroid.customName || asteroid.baseName}</Title>
        <Subtitle>
          {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
        </Subtitle>
        <TabContainer
          containerHeight={'50px'}
          containerCss={{ color: '#777' }}
          controller={{
            active: activeTab,
            setActive: onSetTab
          }}
          tabCss={{ fontSize: '15px', width: '50%' }}
          tabs={[
            {
              icon: <InfoIcon />,
              label: 'Asteroid Details',
            },
            {
              icon: <CompositionIcon />,
              label: 'Resource Map',
            }
          ]}
        />
        {!asteroid.scanned && asteroid.owner && account && Address.areEqual(asteroid.owner, account) && (
          <ExtraInfo>
            <b>You own this asteroid.</b> Scan it to determine its<br/>
            final resource composition and bonuses.

            <Button
              onClick={() => history.push(`/asteroids/${asteroid.i}/resources`)}
              style={{ marginTop: 10 }}>
              Scan Asteroid
            </Button>
          </ExtraInfo>
        )}

        {/* TODO (enhancement): animate in */}
        {asteroid.scanned && activeTab === 1 && (
          <ResourceMapSelector asteroid={asteroid} onClose={() => setActiveTab(0)} />
        )}
      </Pane>
    </>
  );
};

export default SceneMenu;