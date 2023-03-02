import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import PuffLoader from 'react-spinners/PuffLoader';
import { toRarity, toSize, toSpectralType, Asteroid as AsteroidLib, Capable, Construction, CoreSample, Inventory } from '@influenceth/sdk';
import { FaSearchPlus as DetailsIcon } from 'react-icons/fa';
import ReactTooltip from 'react-tooltip';

import IconButton from '~/components/IconButton';
import {
  CloseIcon,
  NewCoreSampleIcon,
  ForwardIcon,
  InfoIcon,
  PopoutIcon,
  WarningOutlineIcon,
} from '~/components/Icons';
import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useConstructionManager from '~/hooks/useConstructionManager';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import useCrew from '~/hooks/useCrew';
import useCrewContext from '~/hooks/useCrewContext';
import { formatFixed, keyify } from '~/lib/utils';
import { hexToRGB } from '~/theme';
import CoreSampleMouseover from './mouseovers/CoreSampleMouseover';
import ClipCorner from '~/components/ClipCorner';
import CrewCard from '~/components/CrewCard';
import CrewCardFramed from '~/components/CrewCardFramed';
import useActionButtons from './useActionButtons';
import InProgressIcon from '~/components/InProgressIcon';

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

const OuterTitleRow = styled.div`
  display: flex;
  flex-direction: row;
`;

const ContentRow = styled.div`
  display: flex;
  flex-direction: row;
`;

const CaptainCardContainer = styled.div`
  margin-right: 12px;
`;

const TitleRow = styled.div`
  display: flex;
  flex-direction: row;
  ${p => p.hasLink && `
    cursor: ${p.theme.cursors.active};
  `}
  & > svg {
    color: ${p => p.theme.colors.main};
    margin-top: 10px;
    margin-left: 5px;
    opacity: 0.7;
    transition: opacity 250ms ease;
  }
  &:hover > svg {
    opacity: 1;
  }
`;

const Title = styled.div`
  color: white;
  font-size: ${p => p.hasThumb ? 40 : 50}px;
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
  font-size: 95%;
  margin-right: 0;
  position: absolute !important;
  top: 5px;
  right: 5px;
  z-index: 2;
  opacity: 0.7;
  &:hover {
    opacity: 1;
  }
`;


const thumbCornerSize = 10;
const ThumbPreview = styled.div`
  background: #000;
  border: 1px solid rgba(255,255,255,0.25);
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% calc(100% - ${thumbCornerSize}px),
    calc(100% - ${thumbCornerSize}px) 100%,
    0% 100%
  );
  color: #999;
  font-size: 14px;
  height: 145px;
  padding: 10px 12px;
  position: relative;
  transition: border-color 250ms ease;
  width: 232px;

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

const ThumbBanner = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  color: ${p => p.color ? p.theme.colors[p.color] : 'white'};
  display: flex;
  font-weight: bold;
  height: 36px;
  justify-content: center;
  left: 5%;
  position: absolute;
  text-transform: uppercase;
  top: calc(50% - 15px);
  width: 90%;
  z-index: 1;
  & > svg {
    font-size: 18px;
    margin-right: 6px;
  }
`;

const RarityEarmark = styled.div`
  background: ${p => p.theme.colors.rarity[p.rarity]};
  position: absolute;
  top: 8px;
  left: 8px;
  height: 15px;
  width: 15px;
  z-index: 1;
  clip-path: polygon(
    0% 0%,
    100% 0%,
    0% 100%
  );
`;

const Pane = styled.div`
  cursor: ${p => p.theme.cursors.active};
  opacity: ${p => p.visible ? 1 : 0};
  overflow: hidden;
  padding-left: 50px;
  pointer-events: all;
  transition: opacity 750ms ease;
`;

const ThumbWrapper = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  ${p => p.hasCaptainCard && `margin-top: 12px;`}
  margin-left: -32px;
  margin-right: 16px;
  & > svg {
    font-size: 18px;
    margin-right: 15px;
  }

  &:hover {
    ${ThumbPreview} {
      border-color: white;
    }
  }
`;

const ActionButtonContainer = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: row;
  padding-top: 12px;
`;

// const LotConstructionWarning = styled.span`
//   color: ${p => p.theme.colors.error};
//   display: inline-block;
//   margin-left: 6px;
// `;

// const PlotDetails = styled.div`
//   border-left: 1px solid #444;
//   margin-bottom: 12px;
//   padding-left: 15px;
//   width: 325px;
// `;
// const DetailRow = styled.div`
//   color: white;  
//   display: flex;
//   flex-direction: row;
//   font-size: 90%;
//   padding: 4px 0;
//   width: 100%;
//   & > label {
//     flex: 1;
//     opacity: 0.5;
//   }
//   & > div {
//     text-align: right;
//   }
// `;
// const ResourceRow = styled.div`
//   & > span {
//     background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.5);
//     border-radius: 10px;
//     color: rgba(255, 255, 255, 0.9);
//     display: inline-block;
//     font-size: 12px;
//     line-height: 18.4px;
//     margin-right: 4px;
//     text-align: center;
//     width: 40px;
//   }
// `;

// const ThumbFootButtons = styled.div``;
// const ThumbFootButton = styled.div`
//   align-items: center;
//   border: 1px solid currentColor;
//   border-radius: 18px;
//   color: white;
//   cursor: ${p => p.theme.cursors.active};
//   display: flex;
//   font-size: 28px;
//   height: 36px;
//   justify-content: center;
//   opacity: 0.5;
//   position: relative;
//   transition-property: color, opacity;
//   transition-duration: 250ms;
//   width: 36px;

//   ${p => p.badge && `
//     &:before {
//       align-items: center;
//       background-color: white;
//       border-radius: 8px;
//       color: black;
//       content: "${p.badge}";
//       display: flex;
//       font-size: 14px;
//       font-weight: bold;
//       justify-content: center;
//       position: absolute;
//       top: -4px;
//       right: -4px;
//       width: 16px;
//       height: 16px;
//       transition-property: color, background-color;
//       transition-duration: 250ms;
//     }
//   `}

//   &:hover {
//     color: ${p => p.theme.colors.main};
//     opacity: 1;
//     &:before {
//       background-color: ${p => p.theme.colors.main};
//       color: white;
//     }
//   }
// `;

const ThumbLoader = () => <ThumbLoading><PuffLoader color="white" /></ThumbLoading>;
const CaptainCard = ({ crewId }) => {
  const { data: crew } = useCrew(crewId);
  const history = useHistory();

  // onclick should open up crew profile
  const onClick = useCallback(() => {
    const captainId = crew?.crewMembers?.length && crew.crewMembers[0];
    history.push(`/crew/${captainId}`);
  }, [crew]);

  if (!crewId || !crew?.crewMembers.length) return null;
  return (
    <CrewCardFramed
      crewmate={{ i: crew.crewMembers[0] }}
      onClick={onClick}
      width={50} />
  );
}

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

  const { actions, props: actionProps } = useActionButtons();
  const { data: asteroid } = useAsteroid(asteroidId);
  const buildings = useBuildingAssets();
  const { constructionStatus, isAtRisk } = useConstructionManager(asteroidId, plotId);
  const { crew } = useCrewContext();
  const { data: plot } = usePlot(asteroidId, plotId);
  const saleIsActive = useStore(s => s.sale);

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


  const [hover, setHover] = useState();
  const onMouseEvent = useCallback((e) => {
    setHover(e.type === 'mouseenter');
  });

  useEffect(() => {
    setHover(false);
  }, [asteroidId, plotId, zoomStatus, zoomToPlot]);
  
  const {
    captainCard,
    title,
    titleLink,
    subtitle,
    hoverSubtitle,
    thumbnail,
    thumbVisible,
  } = useMemo(() => {
    const pane = {
      thumbVisible: true
    };
    if (zoomStatus === 'out' && asteroidId) {
      if (asteroid) {
        pane.title = asteroid.customName || asteroid.baseName;
        pane.titleLink = `/asteroids/${asteroid.i}`;
        pane.subtitle = <>{toSize(asteroid.radius)} <b>{toSpectralType(asteroid.spectralType)}-type</b></>;
        pane.hoverSubtitle = 'Zoom to Asteroid';
        // TODO: add captainCard for the "crew" managing the asteroid

        let thumbBanner = '';
        let thumbBannerColor = 'main';
        if (!asteroid.scanned) {
          if (asteroid.owner && asteroid.scanCompletionTime) {
            thumbBanner = 'Scanning...';
            thumbBannerColor = 'main';
          } else if (asteroid.owner) {
            thumbBanner = <><WarningOutlineIcon /> Ready to Scan</>;
            thumbBannerColor = 'success';
          } else if (saleIsActive) {
            thumbBanner = 'Available to Purchase';
            thumbBannerColor = 'main';
          } else {
            thumbBanner = <><WarningOutlineIcon /> Unscanned</>;
            thumbBannerColor = 'error';
          }
        }

        pane.thumbnail = (
          <ThumbBackground>
            {thumbBanner && <ThumbBanner color={thumbBannerColor}>{thumbBanner}</ThumbBanner>}
            {asteroid.scanned && (
              <RarityEarmark
                data-for="infoPane"
                data-tip={toRarity(asteroid.bonuses)}
                data-place="right"
                rarity={toRarity(asteroid.bonuses)} />
            )}
            <AsteroidRendering
              asteroid={asteroid}
              onReady={onRenderReady}
              style={!asteroid.scanned ? { filter: 'grayscale(1)' } : {}} />
          </ThumbBackground>
        );
        pane.thumbVisible = !!renderReady;
      } else {
        pane.title = ' ';
        pane.subtitle = ' ';
        pane.thumbnail = <ThumbLoader />;
      }

    } else if (zoomStatus === 'in') {
      if (zoomToPlot) {
        pane.title = buildings[plot?.building?.capableType || 0]?.name;
        pane.subtitle = <>{asteroid?.customName || asteroid?.baseName} &gt; <b>Lot {plotId.toLocaleString()}</b></>;
        pane.captainCard = plot?.occupier;

      } else if (plotId) {
        if (plot) {
          const thumbUrl = plot.building?.capableType > 0
            ? (
              ['OPERATIONAL', 'DECONSTRUCTING', 'PLANNING'].includes(constructionStatus) && !isAtRisk
                ? buildings[plot.building?.capableType || 0]?.iconUrls?.w400
                : buildings[plot.building?.capableType || 0]?.siteIconUrls?.w400
            )
            : buildings[0]?.iconUrls?.w400;
          pane.title = buildings[plot.building?.capableType || 0]?.name;
          pane.subtitle = <>{asteroid?.customName || asteroid?.baseName} &gt; <b>Lot {plotId.toLocaleString()}</b></>;
          pane.captainCard = plot.occupier;
          pane.hoverSubtitle = 'Zoom to Lot';
          pane.thumbnail = (
            <ThumbBackground image={thumbUrl}>
              {isAtRisk && (
                <ThumbBanner color="error">
                  {plot.occupier === crew?.i ? 'At Risk' : 'Abandoned'}
                </ThumbBanner>
              )}
            </ThumbBackground>
          );
        } else {
          pane.thumbnail = <ThumbLoader />;
        }

      } else if (asteroid) {
        pane.title = asteroid.customName || asteroid.baseName;
        pane.titleLink = `/asteroids/${asteroid.i}`;
        pane.subtitle = (
          <>
            {toSize(asteroid.radius)} <b>{toSpectralType(asteroid.spectralType)}-type</b>
            <SubtitleLoader>
              {!(plotLoader.i === asteroidId && plotLoader.progress === 1) && (
                <ProgressBar progress={plotLoader.i === asteroidId ? plotLoader.progress : 0} />
              )}
            </SubtitleLoader>
          </>
        );
      }
    }
    return pane;
  }, [
    asteroidId,
    asteroid,
    plotId,
    plot,
    renderReady,
    plotLoader,
    zoomStatus,
    zoomToPlot
  ]);

  const onClickTitle = () => {
    history.push(titleLink);
  };

  useEffect(() => ReactTooltip.rebuild(), [actions]);

  return (
    <Pane visible={asteroidId && ['out','in'].includes(zoomStatus)}>
      <ReactTooltip id="infoPane" effect="solid" />
      <OuterTitleRow>
        {captainCard && <CaptainCardContainer><CaptainCard crewId={captainCard} /></CaptainCardContainer>}
        <div>
          {title && (
            <TitleRow hasLink={!!titleLink} onClick={onClickTitle}>
              <Title hasThumb={!!thumbnail}>{title}</Title>
              {titleLink && <PopoutIcon />}
            </TitleRow>
          )}
          {subtitle && <Subtitle>{hover && hoverSubtitle ? <b>{hoverSubtitle}</b> : subtitle}</Subtitle>}
        </div>
      </OuterTitleRow>
      <ContentRow>
        {thumbnail && (
          <ThumbWrapper
            onClick={onClickPane}
            onMouseEnter={onMouseEvent}
            onMouseLeave={onMouseEvent}
            hasCaptainCard={!!captainCard}>
            {hover ? <DetailsIcon /> : <ForwardIcon />}
            <ThumbPreview visible={thumbVisible}>
              <CloseButton onClick={onClosePane}>
                <CloseIcon />
              </CloseButton>
              {thumbnail}
              <ClipCorner dimension={thumbCornerSize} color={hover ? 'white' : 'rgba(255,255,255,0.25)'} />
            </ThumbPreview>
          </ThumbWrapper>
        )}
        {actions?.length > 0 && (
          <ActionButtonContainer>
            {actions.map((ActionButton, i) => (
              <ActionButton key={i} {...actionProps} />
            ))}
          </ActionButtonContainer>
        )}
      </ContentRow>
    </Pane>
  );
};

export default InfoPane;