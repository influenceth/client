import { useCallback, useEffect, useMemo, useState } from '~/lib/react-debug';
import LoadingAnimation from 'react-spinners/PuffLoader';
import styled, { css } from 'styled-components';
import pick from 'lodash/pick';
import { Crewmate } from '@influenceth/sdk';

import silhouette from '~/assets/images/silhouette.png';
import CrewmateCardOverlay, { cardTransitionSpeed, cardTransitionFunction } from '~/components/CrewmateCardOverlay';
import CrewClassIcon from '~/components/CrewClassIcon';
import CrewCollectionEmblem from '~/components/CrewCollectionEmblem';
import DataReadout from '~/components/DataReadout';
import formatters from '~/lib/formatters';
import { safeBigInt } from '~/lib/utils';

const CardLayer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`;

const CardHeader = styled(CardLayer)`
  bottom: auto;
  padding: 8px;
  text-align: left;
`;

const CardFooter = styled(CardLayer)`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding: 8px;
  text-align: left;
  top: auto;
  & > div:last-child {
    flex: 1;
  }
`;

const CardImage = styled(CardLayer)`
  top: auto;

  & > img {
    display: ${p => p.visible ? 'block' : 'none'};
    width: 100%;
  }

  ${p => p.applyMask ? `mask-image: linear-gradient(to bottom, black 75%, transparent 100%);` : ''}
`;

const Card = styled.div`
  background-color: rgba(20, 20, 20, 0.75);
  ${p => !p.hasOverlay
    ? `background: linear-gradient(
        to bottom,
        rgba(30, 30, 30, 0.15) 10%,
        rgba(${p.classLabel ? `${p.theme.colors.classes.rgb[p.classLabel]}, 0.15` : `30, 30, 30, 0.85`}) 70%,
        rgba(30, 30, 30, 0.15) 100%
      );`
    : ''
  }
  cursor: ${p => p.clickable && p.theme.cursors.active};
  font-size: ${p => p.fontSize || p.theme.fontSizes.detailText};
  padding-top: 137.5%;
  position: relative;
  width: ${p => p.width || '100%'};

  ${p => p.fade ? `
    & ${CardHeader},
    & ${CardImage} {
      opacity: 0.5;
      transition: opacity ${cardTransitionSpeed} ${cardTransitionFunction};
    }
    &:hover ${CardHeader} {
      opacity: 1;
    }
  ` : ''}

  ${p => p.hideHeader && `
    padding-top: 128%;
    & ${CardHeader} {
      display: none;
    }
  `}
  ${p => p.hideFooter && `
    & ${CardFooter} {
      display: none;
    }
  `}
`;

const CrewName = styled.span`
  font-weight: normal;
  ${p => p.noWrapName && `
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
  ${p => p.largerClassIcon && `
    & > svg {
      font-size: 40px;
    }
  `}
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    font-size: 85%;
  }
`;

const EmblemContainer = styled.div`
  margin-left: -4px;
  width: 3.5em;
  ${p => p.hideEmblem && 'display: none;'}
`;

const FooterStats = styled.div`
  font-size: 0.68em;
  min-width: 0;
  & > div:first-child {
    color: white;
    font-size: 1.1em;
    font-weight: bold;
    text-transform: uppercase;
  }
  & > div {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const loadingCss = css`
  position: absolute;
  left: calc(50% - 30px);
  top: 50%;
`;

const AbstractCard = ({ imageUrl, onClick, overlay, ...props }) => {
  const [ imageFailed, setImageFailed ] = useState(false);
  const [ imageLoaded, setImageLoaded ] = useState(false);

  // make sure onLoad and onError get called by making sure they are reset to false on imageUrl change
  const [ readyToLoadUrl, setReadyToLoadUrl ] = useState(imageUrl);

  useEffect(import.meta.url, () => {
    setImageFailed(false);
    setImageLoaded(false);
    setReadyToLoadUrl(imageUrl);
  }, [imageUrl]);

  useEffect(import.meta.url, () => {
    if (imageFailed) setImageLoaded(true);
  }, [imageFailed]);

  // TODO: make this a hook?
  // onLoad is not reliable if, ex. the image is already cached, so we use `complete`
  const watchImageLoad = useCallback(import.meta.url, (input) => {
    if (!input) { return; }
    const img = input;
    const updateFunc = () => setImageLoaded(true);
    img.onload = updateFunc;
    if (img.complete) updateFunc();
  }, [setImageLoaded]);

  return (
    <Card
      onClick={onClick}
      hasOverlay={!!overlay}
      classLabel={props.crewmateClass ? Crewmate.getClass(props.crewmateClass)?.name : undefined}
      {...props}>
      {!imageLoaded && <LoadingAnimation color={'white'} css={loadingCss} />}
      <CardImage visible={imageLoaded} applyMask={!overlay && !props.hideMask}>
        <img
          ref={watchImageLoad}
          alt={props.crewmateName}
          src={imageFailed ? silhouette : readyToLoadUrl}
          onError={() => setImageFailed(true)} />
      </CardImage>
      <CardHeader>
        <CrewName {...props}>
          <CrewClassIcon crewClass={props.crewmateClass} />{' '}
          {!props.hideNameInHeader && props.crewmateName}
        </CrewName>
        {props.showCollectionInHeader && props.crewmateColl && (
          <DataReadout style={{
            fontSize: '0.68em',
            ...(props.showClassInHeader
              ? {
                paddingBottom: 0,
                marginBottom: -5
              }
              : {}
            )
            }}>
            {Crewmate.getCollection(props.crewmateColl)?.name}
          </DataReadout>
        )}
        {props.showClassInHeader && props.crewmateClass && (
          <DataReadout style={{ fontSize: '0.9em', opacity: 0.7 }}>
            {Crewmate.getClass(props.crewmateClass)?.name}
          </DataReadout>
        )}
      </CardHeader>
      {!overlay && (
        <CardFooter>
          {props.crewmateColl && (
            <EmblemContainer>
              <CrewCollectionEmblem
                collection={props.crewmateColl}
                style={{ width: '100%' }} />
            </EmblemContainer>
          )}
          <FooterStats>
            {!props.showClassInHeader && props.crewmateClass ? <div>{Crewmate.getClass(props.crewmateClass)?.name}</div> : null}
            {props.crewmateTitle ? <div>{Crewmate.getTitle(props.crewmateTitle)?.name}</div> : null}
          </FooterStats>
        </CardFooter>
      )}
      {overlay && <CrewmateCardOverlay {...overlay} />}
    </Card>
  );
};

const CrewmateCard = ({ crewmate = {}, useExplicitAppearance, ...props }) => {
  const useName = props.hideIfNoName
    ? (crewmate.Name?.name || '')
    : formatters.crewmateName(crewmate);

  let imageUrl = useMemo(import.meta.url, () => {
    let url = silhouette;
    let options = '';
    if (props.height) options += `&height=${props.height}`;
    if (props.width) options += `&width=${props.width}`;

    if (!useExplicitAppearance && crewmate?.id) {
      url = `${process.env.REACT_APP_IMAGES_URL}/v2/crewmates/${crewmate.id}/image.png?bustOnly=true${options}`;
    } else if (safeBigInt(crewmate.Crewmate?.appearance || 0) > 0n) {
      url = `${process.env.REACT_APP_IMAGES_URL}/v1/crew/provided/image.svg?bustOnly=true&options=${JSON.stringify(
        pick(crewmate.Crewmate, ['coll', 'class', 'title', 'appearance'])
      )}`;
    }
    return url;
  }, [crewmate, useExplicitAppearance]);

  return (
    <AbstractCard
      imageUrl={imageUrl}
      crewmateColl={crewmate.Crewmate?.coll}
      crewmateClass={crewmate.Crewmate?.class}
      crewmateName={useName}
      crewmateTitle={crewmate.Crewmate?.title}
      {...props}
    />
  );
};

export const CrewCaptainCard = ({ crewId, ...props }) => {
  let options = '';
  if (props.height) options += `&height=${props.height}`;
  if (props.width) options += `&width=${props.width}`;

  let imageUrl = useMemo(import.meta.url, () => crewId
    ? `${process.env.REACT_APP_IMAGES_URL}/v2/crews/${crewId}/captain/image.png?bustOnly=true${options}`
    : silhouette,
    [crewId]
  );

  return (
    <AbstractCard
      imageUrl={imageUrl}
      {...props}
    />
  );
};

export default CrewmateCard;