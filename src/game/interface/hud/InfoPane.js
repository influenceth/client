import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { Asteroid, Building, Entity } from '@influenceth/sdk';
import { FaSearchPlus as DetailsIcon } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';

import ClipCorner from '~/components/ClipCorner';
import { CrewCaptainCardFramed } from '~/components/CrewmateCardFramed';
import IconButton from '~/components/IconButton';
import {
  CloseIcon,
  ForwardIcon,
  PopoutIcon,
  WarningOutlineIcon,
} from '~/components/Icons';
import AsteroidRendering from '~/components/AsteroidRendering';
import useActionButtons from '~/hooks/useActionButtons';
import useAsteroid from '~/hooks/useAsteroid';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import useCrew from '~/hooks/useCrew';
import useCrewContext from '~/hooks/useCrewContext';
import RouteSelection from './actionForms/RouteSelection';
import { getBuildingIcon, getLotShipIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';
import useSale from '~/hooks/useSale';
import useShip from '~/hooks/useShip';
import LiveTimer from '~/components/LiveTimer';
import LotLoadingProgress from './LotLoadingProgress';


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
  filter: drop-shadow(0px 0px 2px rgb(0 0 0));
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
  filter: drop-shadow(0px 0px 2px rgb(0 0 0));
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
  ${p => p.theme.clipCorner(thumbCornerSize)};
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
  margin-left: -50px;
  margin-right: 16px;
  & > svg {
    font-size: 18px;
    width: 50px;
  }

  &:hover {
    ${ThumbPreview} {
      border-color: white;
    }
  }
`;

const ActionButtonContainer = styled.div`
  align-self: flex-end;
  display: flex;
  flex-direction: column;
  // padding-top: 12px;
`;

const ActionForm = styled.div`
  margin-bottom: 15px;
  width: 250px;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  width: 100%;
`;

const CaptainCard = ({ crewId }) => {
  const history = useHistory();
  const { data: crew } = useCrew(crewId);

  // onclick should open up crew profile
  const onClick = useCallback(() => {
    if (!crewId) return;
    history.push(`/crew/${crewId}`);
  }, [crewId]);

  return (
    <CrewCaptainCardFramed
      crewId={crew?.id}
      onClick={onClick}
      tooltip={formatters.crewName(crew)}
      tooltipPlace="top"
      width={50} />
  );
}

const InfoPane = () => {
  const history = useHistory();

  const asteroidId = useStore(s => s.asteroids.origin);
  const lotId = useStore(s => s.asteroids.lot);
  const inTravelMode = useStore(s => s.asteroids.travelMode);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const playSound = useStore(s => s.dispatchEffectStartRequested);
  const stopSound = useStore(s => s.dispatchEffectStopRequested);

  const { actions, props: actionProps } = useActionButtons();
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { constructionStatus, isAtRisk } = useConstructionManager(lotId);
  const { crew } = useCrewContext();
  const { data: lot, isLoading: lotIsLoading } = useLot(lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined);
  const saleIsActive = useSale(Entity.IDS.ASTEROID);

  const [hover, setHover] = useState();
  const [currentSound, setCurrentSound] = useState();

  const onMouseEvent = (e) => setHover(e.type === 'mouseenter');

  const onClickPane = useCallback(() => {
    // open lot
    if (asteroidId && lotId && zoomStatus === 'in') {
      dispatchZoomScene({ type: 'LOT' });

    // open asteroid details
    } else if (asteroidId && zoomStatus === 'in') {
      history.push(`/asteroids/${asteroidId}`);

    // zoom in to Asteroid
    } else if (asteroidId && zoomStatus === 'out') {
      updateZoomStatus('zooming-in');
    }
  }, [asteroidId, lotId, zoomStatus, lot?.building]);

  const onClosePane = useCallback((e) => {
    e.stopPropagation();

    // deselect lot
    if (asteroidId && lotId && zoomStatus === 'in') {
      dispatchLotSelected();

    // deselect asteroid
    } else if (asteroidId && zoomStatus === 'out') {
      dispatchOriginSelected();
    }

    return false;
  }, [asteroidId, lotId, zoomStatus]);

  // Control sounds for buildings
  useEffect(() => {
    if (currentSound) {
      stopSound(currentSound, { fadeOut: 500 });
      setCurrentSound(null);
    }

    if (lot?.building) {
      const soundName = Building.TYPES[lot?.building?.Building?.buildingType]?.name?.toLowerCase();
      playSound(soundName, { loop: false, duration: 4000, fadeOut: 1000 });
      setCurrentSound(soundName);
    }
  }, [lot]);

  useEffect(() => {
    setHover(false);
  }, [asteroidId, lotId, zoomStatus, zoomScene]);

  const {
    captainCard,
    title,
    titleLink,
    subtitle,
    hoverSubtitle,
    thumbnail,
    thumbVisible,
  } = useMemo(() => {
    const pane = {};

    if (zoomStatus === 'out' && zoomScene?.type === 'SHIP') {
      if (ship) {
        pane.title = formatters.shipName(ship);
        if (ship.Ship?.transitDeparture > 0) {
          pane.subtitle = 'In Flight';
        } else {
          pane.subtitle = <>{formatters.asteroidName(asteroid)} &gt; <b>{lotId ? formatters.lotName(lotId) : 'In Orbit'}</b></>;
        }
        pane.captainCard = ship.Control?.controller?.id;
      }
    } else if (zoomStatus === 'out' && asteroid) {
      pane.title = formatters.asteroidName(asteroid);
      pane.titleLink = `/asteroids/${asteroid.id}`;
      pane.subtitle = <>{Asteroid.Entity.getSize(asteroid)} <b>{Asteroid.Entity.getSpectralType(asteroid)}-type</b></>;
      pane.hoverSubtitle = 'Zoom to Asteroid';
      pane.captainCard = asteroid.Control?.controller?.id;

      let thumbBanner = '';
      let thumbBannerColor = 'main';
      if (asteroid.Celestial.scanStatus < Asteroid.SCAN_STATUSES.SURFACE_SCANNED) {
        if (asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.SURFACE_SCANNING) {
          thumbBanner = 'Scanning Surface...';
          thumbBannerColor = 'main';
        } else if (asteroid.Nft?.owner) {
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

      const rarity = Asteroid.Entity.getRarity(asteroid);
      pane.thumbVisible = true;
      pane.thumbnail = (
        <ThumbBackground>
          {thumbBanner && <ThumbBanner color={thumbBannerColor}>{thumbBanner}</ThumbBanner>}
          {asteroid.Celestial.scanStatus >= Asteroid.SCAN_STATUSES.SURFACE_SCANNED && (
            <RarityEarmark
              data-tooltip-id="infoPaneTooltip"
              data-tooltip-content={rarity}
              data-tooltip-place="right"
              rarity={rarity} />
          )}
          <AsteroidRendering
            asteroid={asteroid}
            style={asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.UNSCANNED ? { filter: 'grayscale(1)' } : {}}
            varyDistance />
        </ThumbBackground>
      );

    } else if (zoomStatus === 'in') {
      const isIncompleteBuilding = lot?.building && !['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus);
      const explicitLotControllerId = lot?.Control?._isExplicit ? lot?.Control?.controller?.id : undefined;
      if (zoomScene?.type === 'LOT') {
        if (zoomScene?.overrides?.buildingType) {
          pane.title = Building.TYPES[zoomScene?.overrides?.buildingType]?.name;
        } else {
          pane.title = lot?.building ? `${formatters.buildingName(lot.building)}${isIncompleteBuilding ? ' (Site)' : ''}` : 'Empty Lot';
        }
        pane.subtitle = <>{formatters.asteroidName(asteroid)} &gt; <b>{formatters.lotName(lotId)}</b></>;
        pane.captainCard = lot?.building?.Control?.controller?.id || explicitLotControllerId;
      } else if (zoomScene?.type === 'SHIP' && ship) {
        pane.title = formatters.shipName(ship);
        if (ship.Ship?.transitDeparture > 0) {
          pane.subtitle = 'In Flight';
        } else {
          pane.subtitle = <>{formatters.asteroidName(asteroid)} &gt; <b>{lotId ? formatters.lotName(lotId) : 'In Orbit'}</b></>;
        }
        pane.captainCard = ship.Control?.controller?.id;
      } else if (lotId && lot && lot.surfaceShip) {
        const thumbUrl = getLotShipIcon(lot.surfaceShip.Ship?.shipType || 0, 'w400');
        pane.title = formatters.shipName(lot.surfaceShip);
        pane.subtitle = <>{formatters.asteroidName(asteroid)} &gt; <b>{formatters.lotName(lotId)}</b></>;
        pane.captainCard = lot.surfaceShip.Control?.controller?.id;
        pane.hoverSubtitle = 'Zoom to Lot';
        pane.thumbVisible = true;
        pane.thumbnail = <ThumbBackground image={thumbUrl} />;
      } else if (lotId && lot) {
        let hologram = !!(isAtRisk || isIncompleteBuilding);
        hologram = lot.building ? hologram : false;
        const thumbUrl = getBuildingIcon(lot.building?.Building?.buildingType || 0, 'w400', hologram);
        pane.title = lot?.building ? `${formatters.buildingName(lot.building)}${isIncompleteBuilding ? ' (Site)' : ''}` : 'Empty Lot';
        pane.subtitle = <>{formatters.asteroidName(asteroid)} &gt; <b>{formatters.lotName(lotId)}</b></>;
        pane.captainCard = lot.building?.Control?.controller?.id || explicitLotControllerId;
        pane.hoverSubtitle = 'Zoom to Lot';
        pane.thumbVisible = true;
        pane.thumbnail = (
          <ThumbBackground image={thumbUrl}>
            {isIncompleteBuilding && (
              <>
                {lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION
                ? <ThumbBanner color="main">Under Construction</ThumbBanner>
                : (isAtRisk
                  ? <ThumbBanner color="error">Expired</ThumbBanner>
                  : <ThumbBanner color="warning"><LiveTimer target={lot?.building?.Building?.plannedAt + Building.GRACE_PERIOD} /></ThumbBanner>
                )}
              </>
            )}
          </ThumbBackground>
        );
      } else if (lotId) {
        pane.thumbVisible = true;
        pane.thumbnail = <ThumbBackground image={getBuildingIcon(0, 'w400')} />;
      } else if (asteroid) {
        pane.thumbVisible = false;
        pane.title = formatters.asteroidName(asteroid);
        pane.titleLink = `/asteroids/${asteroid.id}`;
        pane.subtitle = (
          <>
            {Asteroid.Entity.getSize(asteroid)} <b>{Asteroid.Entity.getSpectralType(asteroid)}-type</b>
            <SubtitleLoader>
              <LotLoadingProgress asteroidId={asteroidId} />
            </SubtitleLoader>
          </>
        );
      }
    }
    return pane;
  }, [
    asteroidId,
    asteroid,
    constructionStatus,
    crew?.id,
    isAtRisk,
    lotId,
    lot,
    saleIsActive,
    ship,
    zoomStatus,
    zoomScene
  ]);

  const onClickTitle = () => {
    history.push(titleLink);
  };

  if (lotIsLoading || asteroidIsLoading || shipIsLoading) return null;
  return (
    <Pane visible={asteroidId && ['out','in'].includes(zoomStatus)}>
      <Tooltip id="infoPaneTooltip" />
      <OuterTitleRow style={captainCard && !thumbnail ? { marginBottom: 8 } : {}}>
        {captainCard && <CaptainCardContainer><CaptainCard crewId={captainCard} /></CaptainCardContainer>}
        <div style={captainCard && !thumbnail ? { marginTop: -8 } : {}}>
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
              <CloseButton onClick={onClosePane} borderless>
                <CloseIcon />
              </CloseButton>
              {thumbnail}
              <ClipCorner dimension={thumbCornerSize} color={hover ? 'white' : 'rgba(255,255,255,0.25)'} />
            </ThumbPreview>
          </ThumbWrapper>
        )}
        {actions?.length > 0 && (
          <ActionButtonContainer>
            {inTravelMode && zoomStatus === 'out' && <ActionForm><RouteSelection /></ActionForm>}
            <ActionButtons>
              {actions.map((ActionButton, i) => (
                <ActionButton key={i} {...actionProps} />
              ))}
            </ActionButtons>
          </ActionButtonContainer>
        )}
      </ContentRow>
    </Pane>
  );
};

export default InfoPane;