import styled from 'styled-components';

import silhouette from '~/assets/images/silhouette.png';
import CrewmateCardOverlay, { cardTransitionSpeed, cardTransitionFunction } from '~/components/CrewmateCardOverlay';

const CardLayer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`;

const CardImage = styled(CardLayer)`
  top: auto;
  left: 5%;
  & > img {
    display: block;
    opacity: 0.5;
    width: 100%;
  }
`;

const Card = styled.div`
  background-color: rgba(20, 20, 20, 0.75);
  background: linear-gradient(to top, ${p => p.theme.colors.main} 0%, transparent 100%);
  cursor: ${p => p.clickable && p.theme.cursors.active};
  padding-top: 137.5%;
  position: relative;
  width: 100%;

  ${p => p.fade ? `
    & ${CardImage} {
      opacity: 0.5;
      transition: opacity ${cardTransitionSpeed} ${cardTransitionFunction};
    }
  ` : ''}
`;

const CrewSilhouetteCard = ({ onClick, overlay, ...props }) => {
  return (
    <Card onClick={onClick} hasOverlay={!!overlay} {...props}>
      <CardImage>
        <img alt="Crewmate" src={silhouette} />
      </CardImage>
      {overlay && <CrewmateCardOverlay {...overlay} />}
    </Card>
  );
};

export default CrewSilhouetteCard;