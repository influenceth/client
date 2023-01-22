import { useEffect, useMemo, useState } from 'react';
import LoadingAnimation from 'react-spinners/PuffLoader';
import styled, { css } from 'styled-components';
import pick from 'lodash/pick';
import { Crewmate } from '@influenceth/sdk';

import silhouette from '~/assets/images/silhouette.png';
import CrewCardOverlay, { cardTransitionSpeed, cardTransitionFunction } from '~/components/CrewCardOverlay';
import CrewClassIcon from '~/components/CrewClassIcon';
import CrewCollectionEmblem from '~/components/CrewCollectionEmblem';
import DataReadout from '~/components/DataReadout';

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

const CrewCard = ({ crew: crewmate, onClick, overlay, ...props }) => {
  const [ imageFailed, setImageFailed ] = useState(false);
  const [ imageLoaded, setImageLoaded ] = useState(false);

  const useName = crewmate.name || (crewmate.i && `Crew Member #${crewmate.i}`) || '';
  const classLabel = Crewmate.getClass(crewmate.crewClass)?.name;

  let imageUrl = useMemo(() => {
    let url = silhouette;
    if (crewmate.i) {
      url = `${process.env.REACT_APP_IMAGES_URL}/v1/crew/${crewmate.i}/image.svg?bustOnly=true`;
    } else if (crewmate.crewClass) {
      url = `${process.env.REACT_APP_IMAGES_URL}/v1/crew/provided/image.svg?bustOnly=true&options=${JSON.stringify(
        pick(crewmate, [
          'crewCollection', 'sex', 'body', 'crewClass', 'outfit', 'title',
          'hair', 'facialFeature', 'hairColor', 'headPiece', 'bonusItem'
        ])
      )}`;
    }
    return url;
  }, [crewmate]);

  // make sure onLoad and onError get called by making sure they are reset to false on imageUrl change
  const [ readyToLoadUrl, setReadyToLoadUrl ] = useState(imageUrl);
  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
    setReadyToLoadUrl(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    if (imageFailed) setImageLoaded(true)
  }, [imageFailed]);

  return (
    <Card
      onClick={onClick}
      hasOverlay={!!overlay}
      classLabel={classLabel}
      {...props}>
      <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
      <CardImage visible={imageLoaded} applyMask={!overlay && !props.hideMask}>
        <img
          alt={useName}
          src={imageFailed ? silhouette : readyToLoadUrl}
          onError={() => setImageFailed(true)}
          onLoad={() => setImageLoaded(true)} />
      </CardImage>
      <CardHeader>
        <CrewName {...props}>
          <CrewClassIcon crewClass={crewmate.crewClass} />{' '}
          {!props.hideNameInHeader && useName}
        </CrewName>
        {!props.hideCollectionInHeader && (
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
            {Crewmate.getCollection(crewmate.crewCollection)?.name}
          </DataReadout>
        )}
        {props.showClassInHeader && <DataReadout style={{ fontSize: '0.9em', opacity: 0.7 }}>{Crewmate.getClass(crewmate.crewClass)?.name}</DataReadout>}
      </CardHeader>
      {!overlay && (
        <CardFooter>
          <EmblemContainer>
            <CrewCollectionEmblem
              collection={crewmate.crewCollection}
              style={{ width: '100%' }} />
          </EmblemContainer>
          <FooterStats>
            <div>{Crewmate.getClass(crewmate.crewClass)?.name}</div>
            <div>{Crewmate.getTitle(crewmate.title)?.name}</div>
          </FooterStats>
        </CardFooter>
      )}
      {overlay && <CrewCardOverlay {...overlay} />}
    </Card>
  );
};

export default CrewCard;