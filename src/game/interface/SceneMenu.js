import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import utils, { Address } from 'influence-utils';
import ReactTooltip from 'react-tooltip';
import {
  FaCubes as InfrastructureIcon,
  FaGem as ResourceIcon,
  FaSearchPlus as DetailsIcon
} from 'react-icons/fa';
import LoadingAnimation from 'react-spinners/BarLoader';


import Button from '~/components/ButtonAlt';
import IconButton from '~/components/IconButton';
import {
  BackIcon,
  CloseIcon,
  InfoIcon,
  CancelBlueprintIcon,
  CoreSampleIcon,
  DeconstructIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  // SurfaceTransferIcon // TODO: ...
} from '~/components/Icons';
import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import useAsteroid from '~/hooks/useAsteroid';
import useScanAsteroid from '~/hooks/useScanAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import ResourceMapSelector from './sceneMenu/ResourceMapSelector';

const rightModuleWidth = 375;


const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;
const outlineAnimation = keyframes`
  0% { outline-width: 0; }
  50% { outline-width: 3px; }
  100% { outline-width: 0; }
`;

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

const SubtitleLoader = styled.span`
  ${p => p.animated && css`animation: ${opacityAnimation} 1000ms linear infinite;`}
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
  & > *:not(:last-child) {
    margin-bottom: 12px;
    width: ${rightModuleWidth}px;
  }
`;

const ActionModule = styled.div`
  border-right: 3px solid ${p => p.theme.colors.main};
  opacity: ${p => p.visible ? 1 : 0};
  padding-right: 32px;
  transition: opacity 350ms ease, transform 350ms ease;
  transform: translate(${p => p.visible ? 0 : `${rightModuleWidth + 5}px`}, ${p => p.lower ? `52px` : 0});
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
  position: relative;
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
    font-size: 55px;
    height: 100%;
    justify-content: center;
    overflow: hidden;
    position: relative;
    transition: background-color 250ms ease;
    width: 100%;
    & > span {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
    }
  }

  ${p => p?.badge && `
    &:before {
      background-color: ${p.theme.colors.main};
      content: "${p.badge}";
      color: white;
      border-radius: 2em;
      font-size: 12px;
      font-weight: bold;
      line-height: 20px;
      position: absolute;
      text-align: center;
      top: -8px;
      right: -8px;
      height: 20px;
      width: 20px;
      z-index: 1;
    }
  `}

  ${p => p.attention && css`
    animation: ${outlineAnimation} 800ms ease-out infinite;
    border-color: ${p.theme.colors.success};
    color: ${p.theme.colors.success};
    outline: 0 solid ${p.theme.colors.success};
    & > div {
      background-color: rgba(${p.theme.colors.successRGB}, 0.2);
    }
    &:before {
      background-color: ${p => p.theme.colors.success};
    }
  `}

  ${p => p.disabled
    ? `
      border-color: #777;
      color: #777;
      cursor: ${p.theme.cursors.default};
      opacity: 0.75;
      & > div {
        background-color: rgba(50, 50, 50, 0.2);
      }
      &:before {
        background-color: #777;
      }
    `
    : `
      &:hover {
        color: white;
        & > div {
          background-color: rgba(${p.theme.colors.mainRGB}, 0.4);
        }
      }
    `
  }

`;

const CloseButton = styled(IconButton)`
  font-size: 70%;
  margin-right: 0;
  position: absolute !important;
  top: 2px;
  right: 6px;
  z-index: 2;
`;

const ThumbPreview = styled.div`
  background: black;
  border: 1px solid rgba(255,255,255,0.25);
  color: #999;
  font-size: 14px;
  height: 200px;
  padding: 10px 12px;
  position: relative;
  transition: border-color 250ms ease;
  width: 320px;

  & b {
    color: white;
    font-weight: normal;
  }

  transition: opacity 250ms ease;
  opacity: ${p => p.visible ? 1 : 0};
`;

const ThumbBackground = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  left: 0;
  width: 100%;
  z-index: 0;
`;

const ThumbMain = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  width: 100%;
  z-index: 1;
`;

const ThumbTitle = styled.div`
  color: white;
  font-size: 22px;
  line-height: 22px;
`;
const ThumbSubtitle = styled.div`
  line-height: 18px;
`;
const ThumbFootnote = styled.div`
  & > div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
`;

const Rarity = styled.div`
  font-weight: bold;
  &:before {
    content: "${p => p.rarity}";
  }

  ${p => p.rarity
    ? `color: ${p.theme.colors.rarity[p.rarity]};`
    : 'display: none;'
  }
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
    & ${ThumbPreview} {
      border-color: white;
    }
  }
`;

const SceneMenu = (props) => {
  const { account } = useAuth();
  const asteroidId = useStore(s => s.asteroids.origin);
  const plotId = useStore(s => s.asteroids.plot);
  const saleIsActive = useStore(s => s.sale);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const showResourceMap = useStore(s => s.asteroids.showResourceMap);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  
  const plotLoader = useStore(s => s.plotLoader);
  const history = useHistory();

  const { data: asteroid } = useAsteroid(asteroidId);
  const { scanStatus } = useScanAsteroid(asteroid);

  const [renderReady, setRenderReady] = useState(false);
  const [resourceMode, setResourceMode] = useState();

  const plotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);

  const onClickPane = useCallback(() => {
    // open plot
    if (asteroidId && plotId && zoomStatus === 'in') {
      // TODO: ...

    // open asteroid details
    } else if (asteroidId && zoomStatus === 'in') {
      history.push(`/asteroids/${asteroidId}`);

    // zoom in to asteriod
    } else if (asteroidId && zoomStatus === 'out') {
      updateZoomStatus('zooming-in');
    }
  }, [asteroidId, plotId, zoomStatus]);

  const onClosePane = useCallback((e) => {
    e.stopPropagation();

    // deselect plot
    if (asteroidId && plotId && zoomStatus === 'in') {
      dispatchPlotSelected();

    // deselect asteroid
    } else if (asteroidId && zoomStatus === 'out') {
      dispatchOriginSelected();
    }
    
    return false;
  }, [asteroidId, plotId, zoomStatus]);

  const toggleResourceMode = useCallback((which) => {
    setResourceMode(which);
    if (!which && !!showResourceMap) {
      dispatchResourceMap();
    }
  }, [!!showResourceMap]);

  const onRenderReady = useCallback(() => {
    setRenderReady(true);
  }, []);

  useEffect(() => {
    setResourceMode(!!showResourceMap);
  }, [!!showResourceMap]);

  useEffect(() => {
    setRenderReady(false);
  }, [asteroidId]);

  // TODO: this is mock data
  const plot = useMemo(() => {
    if (!plotId) return null;
    return {
      building: plotId % 4 === 1,
      blueprint: plotId % 3 === 1,
      coreSamplesExist: plotId % 2 === 1,
    };
  }, [plotId]);

  // TODO: need stages for multi-step things (i.e. scanning)
  // TODO: need badge support
  const actions = useMemo(() => {
    const a = [];
    if (asteroid) {
      if (!asteroid.owner) {
        if (saleIsActive) {
          a.push({
            label: 'Purchase Asteroid',
            Icon: PurchaseAsteroidIcon
          });
        } else {
          a.push({
            label: 'Asteroid can be purchased once next sale begins.',
            Icon: PurchaseAsteroidIcon,
            disabled: true
          });
        }
      }
      if (account && asteroid.owner && Address.areEqual(account, asteroid.owner)) {
        if (!asteroid.scanned) {
          if (scanStatus === 'UNSCANNED' || scanStatus === 'SCAN_READY') {
            a.push({
              label: scanStatus === 'UNSCANNED' ? 'Scan Asteroid' : 'Retrieve Scan Results',
              Icon: ScanAsteroidIcon,
              attention: true
            });
          } else if (scanStatus === 'SCANNING' || scanStatus === 'RETRIEVING') {
            a.push({
              label: 'Scan Pending',
              Icon: ScanAsteroidIcon,
              loading: true
            });
          }
        }
      }
    }
    if (asteroid?.scanned && plot) {
      if (resourceMode) {
        a.push({
          label: 'New Core Sample',
          Icon: CoreSampleIcon,
          badge: '12'
        });
        if (plot.coreSamplesExist) {
          a.push({
            label: 'Improve Core Sample',
            Icon: ImproveCoreSampleIcon,
          });
        }
      }
      if (plot.building) {
        a.push({
          label: 'Deconstruct Building',
          Icon: DeconstructIcon
        });
      } else if (plot.blueprint) {
        a.push({
          label: 'Cancel Blueprint',
          Icon: CancelBlueprintIcon
        });
      } else {
        a.push({
          label: 'Lay Blueprint',
          Icon: LayBlueprintIcon
        });
      }
    }

    // TODO: SurfaceTransferIcon?

    return a;
  }, [asteroid, plot, resourceMode]);

  // TODO: componentize ActionButtons
  // TODO: componentize each type of ThumbPreview

  useEffect(() => ReactTooltip.rebuild(), [actions]);

  if (!asteroid) return null;
  return (
    <>
      <LeftWrapper>
        <LeftActions visible={zoomStatus === 'in'}>
          {asteroid?.scanned && (
            <>
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
            </>
          )}
          <LeftActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="right"
            data-tip="Back to Belt"
            onClick={() => updateZoomStatus('zooming-out')}>
            <BackIcon />
          </LeftActionButton>
        </LeftActions>

        <Pane onClick={onClickPane} visible={asteroidId && ['out','in'].includes(zoomStatus)}>
          <IconColumn>
            <IconHolder>
              {zoomStatus === 'in' && !plotId && <InfoIcon />}
              {(zoomStatus === 'out' || plotId) && <DetailsIcon />}
            </IconHolder>
          </IconColumn>
          <InfoColumn>
            {zoomStatus === 'in' && !plotId && (
              <>
                <Title>{asteroid.customName || asteroid.baseName}</Title>
                <Subtitle>
                  <PaneContent>
                    {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
                  </PaneContent>
                  <PaneHoverContent>
                    Asteroid Details
                  </PaneHoverContent>
                  <SubtitleLoader>
                    {!(plotLoader.i === asteroidId && plotLoader.progress === 1) && (
                      <ProgressBar progress={plotLoader.i === asteroidId ? plotLoader.progress : 0} />
                    )}
                  </SubtitleLoader>
                </Subtitle>
              </>
            )}
            {zoomStatus === 'in' && plotId && (
              <div>
                <ThumbPreview visible>
                  <CloseButton borderless onClick={onClosePane}>
                    <CloseIcon />
                  </CloseButton>
                  <ThumbBackground>
                  </ThumbBackground>
                  <ThumbMain>
                    <ThumbTitle>Empty Lot</ThumbTitle>
                    <ThumbSubtitle>
                      <PaneContent>
                        Lot #{plotId.toLocaleString()}
                      </PaneContent>
                      <PaneHoverContent>
                        Zoom to Lot
                      </PaneHoverContent>
                    </ThumbSubtitle>
                    <div style={{ flex: 1 }} />
                    <ThumbFootnote>Uncontrolled</ThumbFootnote>
                  </ThumbMain>
                </ThumbPreview>
              </div>
            )}
            {zoomStatus === 'out' && asteroid && (
              <div>
                <ThumbPreview visible={renderReady}>
                  <CloseButton borderless onClick={onClosePane}>
                    <CloseIcon />
                  </CloseButton>
                  <ThumbBackground>
                    <AsteroidRendering asteroid={asteroid} onReady={onRenderReady} />
                  </ThumbBackground>
                  <ThumbMain>
                    <ThumbTitle>{asteroid.customName || asteroid.baseName}</ThumbTitle>
                    <ThumbSubtitle>
                      <PaneContent>
                        {utils.toSize(asteroid.r)}{' '}
                        <b>{utils.toSpectralType(asteroid.spectralType)}{'-type'}</b>
                        {asteroid.scanned && <Rarity rarity={utils.toRarity(asteroid.bonuses)} />}
                      </PaneContent>
                      <PaneHoverContent>
                        Zoom to Asteroid
                      </PaneHoverContent>
                    </ThumbSubtitle>
                    <div style={{ flex: 1 }} />
                    <ThumbFootnote>
                      <div>
                        <span><b>{plotTally.toLocaleString()}</b> Lots</span>
                        <span><b>{((asteroid.buildingTally || 0) / plotTally).toFixed(2)}%</b> Developed</span>
                      </div>
                    </ThumbFootnote>
                  </ThumbMain>
                </ThumbPreview>
              </div>
            )}
          </InfoColumn>
        </Pane>

      </LeftWrapper>

      <RightWrapper>
        <ActionModule visible={zoomStatus === 'in' && resourceMode} lower={!actions?.length}>
          <ResourceMapSelector
            active={zoomStatus === 'in' && resourceMode}
            asteroid={asteroid} />
        </ActionModule>

        <Rule visible={resourceMode && actions?.length} />

        <RightActions visible={actions?.length > 0}>
          {actions.map(({ label, Icon, ...flags }) => (
            <ActionButton
              key={label}
              data-arrow-color="transparent"
              data-for="global"
              data-place="top"
              data-tip={label}
              {...flags}>
              <div>
                <Icon />
                {flags.loading && <LoadingAnimation color="white" height="1" />}
              </div>
            </ActionButton>
          ))}
        </RightActions>
      </RightWrapper>
    </>
  );
};

export default SceneMenu;