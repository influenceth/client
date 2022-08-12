import { useEffect, useState } from 'react';
import LoadingAnimation from 'react-spinners/PuffLoader';
import styled, { css } from 'styled-components';
import pick from 'lodash/pick';
import { toCrewClass, toCrewCollection, toCrewTitle } from 'influence-utils';

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
    ? 'background: linear-gradient(to bottom, rgba(30, 30, 30, 0.15) 10%, rgba(30, 30, 30, 0.85) 50%, rgba(30, 30, 30, 0.15) 90%);'
    : ''
  }
  cursor: ${p => p.clickable && p.theme.cursors.active};
  font-size: ${p => p.fontSize || p.theme.fontSizes.detailText};
  padding-top: 137.5%;
  position: relative;
  width: 100%;

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

const CrewCard = ({ crew, onClick, overlay, ...props }) => {
  const [ imageLoaded, setImageLoaded ] = useState(false);

  const useName = crew.name || (crew.i && `Crew Member #${crew.i}`) || '';
  
  let imageUrl = silhouette;
  if (crew.i) {
    imageUrl = `${process.env.REACT_APP_IMAGES_URL}/v1/crew/${crew.i}/image.svg?bustOnly=true`;
  } else if (crew.crewClass) {
    imageUrl = `${process.env.REACT_APP_IMAGES_URL}/v1/crew/provided/image.svg?bustOnly=true&options=${JSON.stringify(
      pick(crew, [
        'crewCollection', 'sex', 'body', 'crewClass', 'outfit', 'title',
        'hair', 'facialFeature', 'hairColor', 'headPiece', 'bonusItem'
      ])
    )}`;
  }

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl])

  return (
    <Card onClick={onClick} hasOverlay={!!overlay} {...props}>
      <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
      <CardImage visible={imageLoaded} applyMask={!overlay}>
        <img
          alt={useName}
          src={imageUrl}
          onLoad={() => setImageLoaded(true)} />
      </CardImage>
      <CardHeader>
        <CrewName {...props}>
          <CrewClassIcon crewClass={crew.crewClass} />{' '}
          {useName}
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
            {toCrewCollection(crew.crewCollection)}
          </DataReadout>
        )}
        {props.showClassInHeader && <DataReadout style={{ opacity: 0.7 }}>{toCrewClass(crew.crewClass)}</DataReadout>}
      </CardHeader>
      {!overlay && (
        <CardFooter>
          <EmblemContainer>
            <CrewCollectionEmblem
              collection={crew.crewCollection}
              style={{ width: '100%' }} />
          </EmblemContainer>
          <FooterStats>
            <div>{toCrewClass(crew.crewClass)}</div>
            <div>{toCrewTitle(crew.title)}</div>
          </FooterStats>
        </CardFooter>
      )}
      {overlay && <CrewCardOverlay {...overlay} />}
    </Card>
  );
};

export default CrewCard;