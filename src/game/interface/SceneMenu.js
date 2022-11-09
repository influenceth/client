import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import utils, { Address } from 'influence-utils';
import ReactTooltip from 'react-tooltip';
import {
  FaCubes as InfrastructureIcon,
  FaGem as ResourceIcon
} from 'react-icons/fa';


import Button from '~/components/ButtonAlt';
import { BackIcon, InfoIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import TabContainer from '~/components/TabContainer';
import ResourceMapSelector from './sceneMenu/ResourceMapSelector';

const rightModuleWidth = 375;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  position: absolute;
  bottom: 100px;
`;

const LeftWrapper = styled(Wrapper)`
  left: 0;
`;

const LeftActions = styled.div`
  transform: ${p => p.visible ? 'translateX(0)' : 'translateX(-64px)'};
  transition: transform 250ms ease ${p => p.visible ? '750ms' : '0ms'};
  & > * {
    margin-bottom: 12px;
  }
`;

const IconHolder = styled.div`
  align-items: center;
  border-left: 3px solid ${p => p.theme.colors.main};
  color: #999;
  display: flex;
  font-size: 22px;
  height: 36px;
  justify-content: center;
  transition: background-color 250ms ease, border-color 250ms ease, color 250ms ease;
  width: 64px;
`;

const LeftActionButton = styled(IconHolder)`
  border-color: rgba(255,255,255,0.25);
  border-radius: 0 5px 5px 0;
  pointer-events: all;

  ${p => p.active
    ? `
      border-color: ${p.theme.colors.main};
      background-color: rgba(${p.theme.colors.mainRGB}, 0.3);
      color: white;
      cursor: ${p.theme.cursors.default};
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: #333;
        border-color: white;
        color: white;
      }
    `
  }
`;

const Rule = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.25);
  opacity: ${p => p.visible ? 1 : 0};
  transition: opacity 350ms ease;
  width: 100%;
`;

const PaneContent = styled.span``;
const PaneHoverContent = styled.span`
  color: white;
  display: none;
`;
const Pane = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  opacity: ${p => p.visible ? 1 : 0};
  overflow: hidden;
  pointer-events: all;
  transition: opacity 750ms ease;
  width: 500px;

  & ${IconHolder} {
    border-left: 3px solid ${p => p.theme.colors.main};
  }
  &:hover {
    & ${IconHolder} {
      background: #333;
      color: white;
    }
    & ${PaneContent} {
      display: none;
    }
    & ${PaneHoverContent} {
      display: inline;
    }
  }
`;

const IconColumn = styled.div`
  align-self: stretch;
  margin-right: 24px;
  & > * {
    align-items: center;
    display: flex;
    height: 100% !important;
    justify-content: center;
  }
`;
const InfoColumn = styled.div``;

const Title = styled.div`
  color: white;
  font-size: 50px;
  font-weight: normal;
  margin-bottom: 0px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Subtitle = styled.div`
  color: #999;
  font-size: 15px;
  margin-bottom: 12px;
  & b {
    color: white;
  }
`;

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;
const SubtitleLoader = styled.span`
  ${p => p.animated && `animation: ${opacityAnimation} 1000ms linear infinite;`}
  display: inline-block;
  font-size: 12px;
  line-height: 21.5px;
  margin-left: 10px;
  vertical-align: middle;
  width: 115px;
  & > span {
    border-radius: 10px;
    display: block;
  }
`;
const ProgressBar = styled.div`
  ${p => p.progress === 0 ? css`animation: ${opacityAnimation} 1250ms ease infinite;` : ``}
  background: #333;
  border-radius: 10px;
  height: 4px;
  overflow: hidden;
  position: relative;
  width: 100%;
  &:before {
    content: ' ';
    background: ${p => p.theme.colors.main};
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    transition: width 200ms ease;
    width: ${p => 100 * p.progress}%;
  }
`;

const RightWrapper = styled(Wrapper)`
  right: -23px;
  & > * {
    margin-bottom: 12px;
    width: ${rightModuleWidth}px;
  }
`;

const ActionModule = styled.div`
  border-right: 3px solid ${p => p.theme.colors.main};
  opacity: ${p => p.visible ? 1 : 0};
  padding-right: 32px;
  transition: opacity 350ms ease, transform 350ms ease;
  transform: translateX(${p => p.visible ? 0 : `${rightModuleWidth + 5}px`});
`;

const RightActions = styled(ActionModule)`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding-bottom: 8px;
  padding-top: 8px;
  width: 100%;
`;

const ActionButton = styled.div`
  background: #111;
  border: 1px solid ${p => p.theme.colors.main};
  border-radius: 6px;
  color: ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  height: 64px;
  margin-left: 8px;
  padding: 3px;
  pointer-events: all;
  transition: color 250ms ease;
  width: 64px;
  &:first-child {
    margin-left: 0;
  }
  & > div {
    align-items: center;
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.2);
    border-radius: 3px;
    display: flex;
    font-size: 36px;
    height: 100%;
    justify-content: center;
    transition: background-color 250ms ease;
    width: 100%;
  }

  &:hover {
    color: white;
    & > div {
      background-color: rgba(${p => p.theme.colors.mainRGB}, 0.4);
    }
  }
`;

const SceneMenu = (props) => {
  const { account } = useAuth();
  const origin = useStore(s => s.asteroids.origin);
  const sceneMod = useStore(s => s.asteroids.sceneMod);
  const dispatchSceneMod = useStore(s => s.dispatchSceneMod);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const plotLoader = useStore(s => s.plotLoader);
  const history = useHistory();

  const [resourceMode, setResourceMode] = useState(sceneMod?.type === 'resourceMaps');

  const { data: asteroid } = useAsteroid(origin);

  useEffect(() => ReactTooltip.rebuild(), []);

  const onClickPane = useCallback(() => {
    if (zoomStatus === 'in' && asteroid?.i) {
      history.push(`/asteroids/${asteroid.i}`);
    }
  }, [asteroid?.i]);

  const toggleResourceMode = useCallback((which) => {
    setResourceMode(which);
    if (!which && sceneMod?.type === 'resourceMaps') {
      dispatchSceneMod();
    }
  }, []);

  if (!asteroid) return null;
  return (
    <>
      <LeftWrapper>
        <LeftActions visible={zoomStatus === 'in'}>
          <LeftActionButton
            active={resourceMode}
            data-arrow-color="transparent"
            data-for="global"
            data-place="right"
            data-tip="Resource View"
            onClick={() => toggleResourceMode(true)}>
            <ResourceIcon />
          </LeftActionButton>
          <LeftActionButton
            active={!resourceMode}
            data-arrow-color="transparent"
            data-for="global"
            data-place="right"
            data-tip="Infrastructure View"
            onClick={() => toggleResourceMode(false)}>
            <InfrastructureIcon />
          </LeftActionButton>
          <Rule />
          <LeftActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="right"
            data-tip="Back to Belt"
            onClick={() => updateZoomStatus('zooming-out')}>
            <BackIcon />
          </LeftActionButton>
        </LeftActions>

        <Pane onClick={onClickPane} visible={zoomStatus === 'in'}>
          <IconColumn>
            <IconHolder>
              <InfoIcon />
            </IconHolder>
          </IconColumn>
          <InfoColumn>
            <Title>{asteroid.customName || asteroid.baseName}</Title>
            <Subtitle>
              <PaneContent>
                {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
              </PaneContent>
              <PaneHoverContent>
                Asteroid Details
              </PaneHoverContent>
              <SubtitleLoader>
                {!(plotLoader.i === origin && plotLoader.progress === 1) && (
                  <ProgressBar progress={plotLoader.i === origin ? plotLoader.progress : 0} />
                )}
              </SubtitleLoader>
            </Subtitle>
          </InfoColumn>
        </Pane>
      </LeftWrapper>

      <RightWrapper>
        <ActionModule visible={resourceMode}>
          <ResourceMapSelector
            active={resourceMode}
            asteroid={asteroid} />
        </ActionModule>

        <Rule visible={resourceMode} />

        <RightActions visible>
          <ActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="top"
            data-tip="Action #1">
            <div>
              <ResourceIcon />
            </div>
          </ActionButton>
          <ActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="top"
            data-tip="Action #2">
            <div>
              <ResourceIcon />
            </div>
          </ActionButton>
          <ActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="top"
            data-tip="Action #3">
            <div>
              <ResourceIcon />
            </div>
          </ActionButton>
        </RightActions>
      </RightWrapper>
    </>
  );
};

export default SceneMenu;