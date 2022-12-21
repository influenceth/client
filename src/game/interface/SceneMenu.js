import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { Address, toRarity, toSize, toSpectralType, CoreSample } from '@influenceth/sdk';
import ReactTooltip from 'react-tooltip';
import {
  FaCubes as InfrastructureIcon,
  FaSearchPlus as DetailsIcon
} from 'react-icons/fa';

import IconButton from '~/components/IconButton';
import {
  BackIcon,
  CloseIcon,
  InfoIcon,
  ResourceIcon,
} from '~/components/Icons';
import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useConstructionManager from '~/hooks/useConstructionManager';
import useCrew from '~/hooks/useCrew';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import actionButtons from './sceneMenu/actionButtons';
import ActionDialog from './sceneMenu/ActionDialog';
import ResourceMapSelector from './sceneMenu/ResourceMapSelector';

const rightModuleWidth = 375;

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  position: absolute;
  bottom: 100px;
  z-index: 2;
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
  width: 365px;

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
  ${p => p.image && `
    background-image: url('${p.image}');
    background-position: center center;
    background-repeat: no-repeat;
    background-size: cover;
  `}
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
  const buildings = useBuildingAssets();
  const asteroidId = useStore(s => s.asteroids.origin);
  const { asteroidId: plotAsteroidId, plotId } = useStore(s => s.asteroids.plot || {});
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);

  const showResourceMap = useStore(s => s.asteroids.showResourceMap);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const dispatchZoomToPlot = useStore(s => s.dispatchZoomToPlot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  
  const plotLoader = useStore(s => s.plotLoader);
  const history = useHistory();

  const { data: asteroid } = useAsteroid(asteroidId);
  const { constructionStatus } = useConstructionManager(asteroidId, plotId);
  // TODO: use plotIsLoading
  const { data: plot, isLoading: plotIsLoading } = usePlot(asteroidId, plotId);
  const { crew } = useCrew();

  const [action, setAction] = useState();
  const [renderReady, setRenderReady] = useState(false);
  const [resourceMode, setResourceMode] = useState();

  const plotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);

  const { backLabel, onClickBack } = useMemo(() => {
    if (zoomToPlot) {
      return {
        backLabel: 'Back to Asteroid',
        onClickBack: () => dispatchZoomToPlot()
      }
    }
    return {
      backLabel: 'Back to Belt',
      onClickBack: () => updateZoomStatus('zooming-out')
    }
  }, [zoomToPlot]);

  const onClickPane = useCallback(() => {
    // open plot
    if (asteroidId && plotId && zoomStatus === 'in') {
      dispatchZoomToPlot((plot.building || buildings[0]).name);

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

  // clear emissive map "on" setting if asteroid is not scanned
  // (this only really happens in dev with chain rebuild, but worth the sanity check)
  useEffect(() => {
    if (asteroid && !asteroid.scanned && showResourceMap) {
      dispatchResourceMap();
    }
  }, [asteroid, showResourceMap]);

  const onRenderReady = useCallback(() => {
    setRenderReady(true);
  }, []);

  useEffect(() => {
    setResourceMode(!!showResourceMap);
  }, [!!showResourceMap]);

  useEffect(() => {
    setRenderReady(false);
  }, [asteroidId]);

  // TODO: could reasonably have buttons determine own visibility and remove some redundant logic here
  // (the only problem is parent wouldn't know how many visible buttons there were)
  const actions = useMemo(() => {
    const a = [];
    if (asteroid) {
      if (!asteroid.owner) {
        a.push(actionButtons.PurchaseAsteroid);
      }
      if (!asteroid.scanned) {
        if (account && asteroid.owner && Address.areEqual(account, asteroid.owner)) {
          a.push(actionButtons.ScanAsteroid);
        }
      } else if (plot && crew) {
        if (resourceMode) {
          a.push(actionButtons.NewCoreSample);
          if (!!(plot.coreSamples || []).find((c) => c.resourceId === Number(showResourceMap?.i) && c.yield > 0 && c.status !== CoreSample.STATUS_USED)) {
            a.push(actionButtons.ImproveCoreSample);
          }
        }

        if (constructionStatus === 'OPERATIONAL' && plot.building?.assetId) {
          const buildingAsset = buildings[plot.building.assetId];
          if (buildingAsset.capabilities.includes('extraction')) {
            a.push(actionButtons.Extract);
          }
        } else if (['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus)) {
          a.push(actionButtons.Construct);
        } else if (['READY_TO_PLAN', 'PLANNING'].includes(constructionStatus)) {
          a.push(actionButtons.NewBlueprint);
        }

        if (plot.inventory?.length > 0) {
          a.push(actionButtons.SurfaceTransfer);
        }

        if (['PLANNED', 'CANCELING'].includes(constructionStatus)) {
          a.push(actionButtons.CancelBlueprint);
        }
        if (['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus)) {
          a.push(actionButtons.Deconstruct);
        } 
      }
    }

    return a;
  }, [asteroid, crew, plot, resourceMode]);

  useEffect(() => ReactTooltip.rebuild(), [actions]);

  if (!asteroid) return null;
  return (
    <>
      <LeftWrapper>
        <LeftActions visible={zoomStatus === 'in'}>
          {asteroid?.scanned && !zoomToPlot && (
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
              <Rule visible />
            </>
          )}
          <LeftActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="right"
            data-tip={backLabel}
            onClick={onClickBack}>
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
                    {toSize(asteroid.radius)} <b>{toSpectralType(asteroid.spectralType)}-type</b>
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
            {zoomStatus === 'in' && plotId && zoomToPlot && (
              <>
                <Title>{(plot.building || buildings[0])?.name}</Title>
                <Subtitle>
                  <PaneContent>
                    Lot #{plotId.toLocaleString()}
                  </PaneContent>
                  <PaneHoverContent>
                    Lot Details
                  </PaneHoverContent>
                </Subtitle>
              </>
            )}
            {zoomStatus === 'in' && plot && !zoomToPlot && (
              <div>
                <ThumbPreview visible>
                  <CloseButton borderless onClick={onClosePane}>
                    <CloseIcon />
                  </CloseButton>
                  {['OPERATIONAL', 'DECONSTRUCTING', 'READY_TO_PLAN'].includes(constructionStatus)
                    ? <ThumbBackground image={buildings[plot.building?.assetId || 0]?.iconUrls?.w400} />
                    : <ThumbBackground image={buildings[plot.building?.assetId || 0]?.siteIconUrls?.w400} />
                  }
                  <ThumbMain>
                    <ThumbTitle>{buildings[plot.building?.assetId || 0]?.name}</ThumbTitle>
                    <ThumbSubtitle>
                      <PaneContent>
                        Lot #{plot.i.toLocaleString()}
                      </PaneContent>
                      <PaneHoverContent>
                        Zoom to Lot
                      </PaneHoverContent>
                    </ThumbSubtitle>
                    <div style={{ flex: 1 }} />
                    <ThumbFootnote>{plot.occupier ? `Controlled${plot.occupier === crew?.i ? ' by Me' : ''}` : 'Uncontrolled'}</ThumbFootnote>
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
                        {toSize(asteroid.r)}{' '}
                        <b>{toSpectralType(asteroid.spectralType)}{'-type'}</b>
                        {asteroid.scanned && <Rarity rarity={toRarity(asteroid.bonuses)} />}
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
        <ActionModule visible={zoomStatus === 'in' && !zoomToPlot && resourceMode} lower={!actions?.length}>
          <ResourceMapSelector
            active={zoomStatus === 'in' && !zoomToPlot && resourceMode}
            asteroid={asteroid} />
        </ActionModule>

        <Rule visible={resourceMode && !zoomToPlot && actions?.length} />

        <RightActions visible={actions?.length > 0}>
          {actions.map((ActionButton, i) => (
            <ActionButton
              key={i}
              asteroid={asteroid}
              crew={crew}
              plot={plot}
              onSetAction={setAction} />
          ))}
        </RightActions>
      </RightWrapper>

      {/* TODO: *might* end up making sense to instead put this with each action button that needs it? */}
      {action && (
        <ActionDialog
          actionType={action}
          asteroid={asteroid}
          plot={plot}
          onClose={() => setAction()}
          onSetAction={setAction} />
      )}
    </>
  );
};

export default SceneMenu;