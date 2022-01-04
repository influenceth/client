import { useState } from 'react';
import LoadingAnimation from 'react-spinners/PuffLoader';
import styled, { css } from 'styled-components';
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
`;

const CrewName = styled.span`
  font-size: ${p => p.theme.fontSizes.detailText};
  font-weight: bold;
  padding: 15px 0;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    font-size: 85%;
  }
`;

const EmblemContainer = styled.div`
  margin-left: -4px;
  width: 56px;
`;
const FooterStats = styled.div`
  font-size: 11px;
  & > div:first-child {
    color: white;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
  }
`;

const loadingCss = css`
  position: absolute;
  left: calc(50% - 30px);
  top: 50%;
`;

const CrewCard = ({ crew, onClick, overlay, ...props }) => {
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const imageUrl = crew.crewCollection
    ? `${process.env.REACT_APP_IMAGES_URL}/v1/crew/${crew.i}/image.svg?bustOnly=true`
    : silhouette;
  return (
    <Card onClick={onClick} hasOverlay={!!overlay} {...props}>
      <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
      <CardImage visible={imageLoaded} applyMask={!overlay}>
        <img
          alt={crew.name || `Crew Member #${crew.i}`}
          src={imageUrl}
          onLoad={() => setImageLoaded(true)} />
      </CardImage>
      <CardHeader>
        <CrewName>
          <CrewClassIcon crewClass={crew.crewClass} />{' '}
          {crew.name || `Crew Member #${crew.i}`}
        </CrewName>
        <DataReadout style={{ fontSize: 11 }}>{toCrewCollection(crew.crewCollection)}</DataReadout>
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