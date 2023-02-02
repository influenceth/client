import { useCallback, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import PuffLoader from 'react-spinners/PuffLoader';
import { toRarity, toSize, toSpectralType, Asteroid as AsteroidLib, Capable, Construction, CoreSample, Inventory } from '@influenceth/sdk';
import { FaSearchPlus as DetailsIcon } from 'react-icons/fa';
import ReactTooltip from 'react-tooltip';

import IconButton from '~/components/IconButton';
import {
  CloseIcon,
  CoreSampleIcon,
  InfoIcon,
} from '~/components/Icons';
import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useConstructionManager from '~/hooks/useConstructionManager';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import useCrew from '~/hooks/useCrew';
import { formatFixed, keyify } from '~/lib/utils';
import { hexToRGB } from '~/theme';
import CoreSampleMouseover from './mouseovers/CoreSampleMouseover';

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

const IconlessDetail = styled.div`
  border-left: 3px solid ${p => p.theme.colors.main};
  height: 100%;
  width: 32px;
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

const ThumbLoading = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  height: 100%;
  width: 100%;
`;

const ThumbBackground = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  left: 0;
  width: 100%;
  z-index: 0;
  ${p => p.backgroundColor && `background-color: ${p.backgroundColor};`}
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
  & > b {
    color: rgb(248,133,44);
    font-size: 18px;
    text-transform: uppercase;
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

const LotConstructionWarning = styled.span`
  color: ${p => p.theme.colors.error};
  display: inline-block;
  margin-left: 6px;
`;
const PlotDetails = styled.div`
  border-left: 1px solid #444;
  margin-bottom: 12px;
  padding-left: 15px;
  width: 325px;
`;
const DetailRow = styled.div`
  color: white;  
  display: flex;
  flex-direction: row;
  font-size: 90%;
  padding: 4px 0;
  width: 100%;
  & > label {
    flex: 1;
    opacity: 0.5;
  }
  & > div {
    text-align: right;
  }
`;
const ResourceRow = styled.div`
  & > span {
    background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.5);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.9);
    display: inline-block;
    font-size: 12px;
    line-height: 18.4px;
    margin-right: 4px;
    text-align: center;
    width: 40px;
  }
`;

const ThumbFootButtons = styled.div``;
const ThumbFootButton = styled.div`
  align-items: center;
  border: 1px solid currentColor;
  border-radius: 18px;
  color: white;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 28px;
  height: 36px;
  justify-content: center;
  opacity: 0.5;
  position: relative;
  transition-property: color, opacity;
  transition-duration: 250ms;
  width: 36px;

  ${p => p.badge && `
    &:before {
      align-items: center;
      background-color: white;
      border-radius: 8px;
      color: black;
      content: "${p.badge}";
      display: flex;
      font-size: 14px;
      font-weight: bold;
      justify-content: center;
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      transition-property: color, background-color;
      transition-duration: 250ms;
    }
  `}

  &:hover {
    color: ${p => p.theme.colors.main};
    opacity: 1;
    &:before {
      background-color: ${p => p.theme.colors.main};
      color: white;
    }
  }
`;

const InfoPane = () => {
  const history = useHistory();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { plotId } = useStore(s => s.asteroids.plot) || {};
  const plotLoader = useStore(s => s.plotLoader);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);

  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchZoomToPlot = useStore(s => s.dispatchZoomToPlot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const { data: asteroid } = useAsteroid(asteroidId);
  const buildings = useBuildingAssets();
  const { constructionStatus, isAtRisk } = useConstructionManager(asteroidId, plotId);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const [renderReady, setRenderReady] = useState(false);
  const onRenderReady = useCallback(() => {
    setRenderReady(true);
  }, []);

  const plotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);

  const myPlotCoreSamples = useMemo(() => {
    return (plot?.coreSamples || []).filter((c) => c.owner === crew?.i)
  }, [crew?.i, plot]);

  const onClickPane = useCallback(() => {
    // open plot
    if (asteroidId && plotId && zoomStatus === 'in') {
      dispatchZoomToPlot(true);

    // open asteroid details
    } else if (asteroidId && zoomStatus === 'in') {
      history.push(`/asteroids/${asteroidId}`);

    // zoom in to asteriod
    } else if (asteroidId && zoomStatus === 'out') {
      updateZoomStatus('zooming-in');
    }
  }, [asteroidId, plotId, zoomStatus, plot?.building]);

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

  const topResources = useMemo(() => {
    const resources = [];
    if (plotId && zoomToPlot && asteroid?.scanned) {
      Object.keys((asteroid.resources || {})).forEach((resourceId) => {
        const abundance = AsteroidLib.getAbundanceAtLot(
          asteroid.i,
          BigInt(asteroid.resourceSeed),
          plotId,
          resourceId,
          asteroid.resources[resourceId]
        );
        if (abundance > 0) {
          resources.push(({ resourceId, abundance }));
        }
      });
    }
    return resources.sort((a, b) => b.abundance - a.abundance).slice(0, 1);
  }, [asteroid?.scanned, plotId, zoomToPlot]);

  return (
    <Pane onClick={onClickPane} visible={asteroidId && ['out','in'].includes(zoomStatus)}>
      {zoomToPlot && (
        <IconlessDetail />
      )}
      {!zoomToPlot && (
        <IconColumn>
          <IconHolder>
            {zoomStatus === 'in' && !plotId && <InfoIcon />}
            {(zoomStatus === 'out' || plotId) && <DetailsIcon />}
          </IconHolder>
        </IconColumn>
      )}

      <InfoColumn>
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
        {zoomStatus === 'in' && asteroid && !plotId && (
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
        {zoomStatus === 'in' && plotId && !zoomToPlot && (
          <div>
            <ReactTooltip id="infoPane" effect="solid" />
            <ThumbPreview visible>
              <CloseButton borderless onClick={onClosePane}>
                <CloseIcon />
              </CloseButton>
              {!plot && (
                <ThumbLoading>
                  <PuffLoader color="white" />
                </ThumbLoading>
              )}
              {plot && (
                <>
                  {!(plot.building?.capableType > 0) && <ThumbBackground image={buildings[0]?.iconUrls?.w400} />}
                  {plot.building?.capableType > 0 && (
                    <>
                      {
                        // TODO: if planning, could use the currentConstruction object to go ahead and put hologram image
                        (['OPERATIONAL', 'DECONSTRUCTING', 'PLANNING'].includes(constructionStatus) && !isAtRisk)
                          ? <ThumbBackground image={buildings[plot.building?.capableType || 0]?.iconUrls?.w400} />
                          : (
                            <ThumbBackground
                              backgroundColor={isAtRisk && '#2e1400'}
                              image={buildings[plot.building?.capableType || 0]?.siteIconUrls?.w400} />
                          )
                      }
                    </>
                  )}
                  <ThumbMain>
                    <ThumbTitle>{buildings[plot.building?.capableType || 0]?.name}</ThumbTitle>
                    <ThumbSubtitle>
                      <PaneContent>
                        Lot #{plot.i.toLocaleString()}
                      </PaneContent>
                      <PaneHoverContent>
                        Zoom to Lot
                      </PaneHoverContent>
                    </ThumbSubtitle>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <ThumbFootnote>
                        {isAtRisk ? <b>{plot.occupier === crew?.i ? 'At Risk' : `Abandoned by #${plot.occupier}`}</b> : ''}
                        {!isAtRisk && plot.occupier ? `Controlled by ${plot.occupier === crew?.i ? 'Me' : `#${plot.occupier}`}` : ''}
                        {!plot.occupier && 'Uncontrolled'}
                      </ThumbFootnote>
                      <ThumbFootButtons>
                        {myPlotCoreSamples.length > 0 && (
                          <>
                            <CoreSampleMouseover
                              building={plot?.building}
                              coreSamples={myPlotCoreSamples}>
                              {({ refEl, onToggle }) => (
                                <ThumbFootButton
                                  ref={refEl}
                                  badge={myPlotCoreSamples.length}
                                  data-tip="Toggle Core Sample List"
                                  data-for="infoPane"
                                  data-place="right"
                                  onClick={onToggle}>
                                  <CoreSampleIcon />
                                </ThumbFootButton>
                              )}
                            </CoreSampleMouseover>
                          </>
                        )}
                      </ThumbFootButtons>
                    </div>
                  </ThumbMain>
                </>
              )}
            </ThumbPreview>
          </div>
        )}
        {zoomStatus === 'in' && plotId && zoomToPlot && (
          <>
            <Title>{Capable.TYPES[plot?.building?.capableType || 0]?.name}</Title>
            <Subtitle>
              Lot {plotId.toLocaleString()}
              {plot?.building?.capableType > 0 && plot?.building?.construction?.status !== Construction.STATUS_OPERATIONAL && (
                <LotConstructionWarning>{Construction.STATUSES[plot?.building?.construction?.status]}</LotConstructionWarning>
              )}
            </Subtitle>
            <PlotDetails>
              <DetailRow>
                <label>Controlled by</label>
                {plot?.occupier && <div>{plot.occupier === crew?.i ? 'Me' : `Crew #${plot.occupier}`}</div>}
                {!plot?.occupier && <div>Uncontrolled</div>}
              </DetailRow>
              {topResources?.length > 0 && (
                <DetailRow>
                  <label>Highest Abundance</label>
                  <div>
                    {topResources.map((r) => (
                      <ResourceRow key={r.resourceId} category={keyify(Inventory.RESOURCES[r.resourceId].category)}>
                        <span>{formatFixed(100 * r.abundance, 1)}%</span>
                        {Inventory.RESOURCES[r.resourceId].name}
                      </ResourceRow>
                    ))}
                  </div>
                </DetailRow>
              )}
              {plot?.building?.capableType === 1 && (
                <>
                  <DetailRow>
                    <label>Max Storage Volume</label>
                    <div>{Inventory.CAPACITIES[1][1].volume.toLocaleString()} m<sup>3</sup></div>
                  </DetailRow>
                  <DetailRow>
                    <label>Max Storage Mass</label>
                    <div>{Inventory.CAPACITIES[1][1].mass.toLocaleString()} tonnes</div>
                  </DetailRow>
                  <DetailRow>
                    <label>Available Capacity</label>
                    <div>
                      {constructionStatus === 'OPERATIONAL' ? formatFixed(
                        (100 - Math.ceil(1000 * (
                          (plot.building.inventories && plot.building.inventories[1])
                            ? Math.max(
                              1E-6 * ((plot.building.inventories[1]?.mass || 0) + (plot.building.inventories[1]?.reservedMass || 0)) / Inventory.CAPACITIES[1][1].mass,
                              1E-6 * ((plot.building.inventories[1]?.volume || 0) + (plot.building.inventories[1]?.reservedVolume || 0)) / Inventory.CAPACITIES[1][1].volume,
                            )
                            : 0
                          )) / 10
                        ),
                        1
                      ) : 0}%
                    </div>
                  </DetailRow>
                </>
              )}
            </PlotDetails>
          </>
        )}
      </InfoColumn>
    </Pane>
  )
};

export default InfoPane;