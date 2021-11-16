import { useState } from 'react';
import LoadingAnimation from 'react-spinners/PuffLoader';
import styled, { css } from 'styled-components';
import { toCrewClass } from 'influence-utils';

import silhouette from '~/assets/images/silhouette.png';
import DataReadout from '~/components/DataReadout';

const tSpeed = '300ms';

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
`;

const CardImage = styled(CardLayer)`
  top: auto;

  & > img {
    display: ${p => p.visible ? 'block' : 'none'};
    width: 100%;
  }
`;

const Card = styled.div`
  background: rgba(20, 20, 20, 0.75);
  cursor: ${({ theme, clickable }) => clickable && theme.cursors.active};
  height: 275px;
  min-height: 275px;
  margin: 0px 12px 12px 0;
  position: relative;
  width: 200px;
  min-width: 200px;

  ${p => p.fade ? `
    & ${CardHeader},
    & ${CardImage} {
      opacity: 0.5;
      transition: opacity ${tSpeed} ease-in;
    }
    &:hover ${CardHeader} {
      opacity: 1;
    }
  ` : ``}
`;

const CrewName = styled.span`
  font-size: ${p => p.theme.fontSizes.detailText};
  font-weight: bold;
  padding: 15px 0;
`;

const ClassBadge = styled.span`
  color: ${p => p.theme.colors.classes[p.crewClass]};
`;

const OverlayButton = styled.div`
  font-weight: bold;
  margin-bottom: 12px;
  padding: 4px;
  text-transform: uppercase;
  text-align: center;
  transition: opacity ${tSpeed} ease-in;
  width: calc(100% - 16px);
`;

const OverlayCaption = styled.div`
  padding: 12px;
  font-size: 12px;
  text-align: center;
`;

const OverlayFlourish = styled.div`
  width: 40px;
  height: 0;
  border-bottom: 4px solid transparent;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
`;

const OverlayIcon = styled.div`
  position: absolute;
  font-size: 60px;
  top: calc(50% - 30px);
`;

const CardOverlay = styled(CardLayer)`
  align-items: center;
  border: 1px solid ${(p) => p.alwaysOn.includes('border') ? `rgb(${(p) => p.rgb})` : 'transparent'};
  outline: 3px solid ${(p) => p.alwaysOn.includes('border') ? `rgba(${(p) => p.rgb}, 0.5)` : 'transparent'};
  color: rgb(${(p) => p.rgb});
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-end;
  transition: outline ${tSpeed} ease-in;
  width: 100%;

  ${OverlayButton} {
    background-color: rgba(${(p) => p.rgb}, 0.3);
    color: rgb(${(p) => p.rgb});
    opacity: ${(p) => p.alwaysOn.includes('button') ? 1 : 0};
  }
  ${OverlayCaption} {
    opacity: ${(p) => p.alwaysOn.includes('caption') ? 1 : 0};
  }
  ${OverlayFlourish} {
    border-bottom-color: rgb(${(p) => p.rgb});
    opacity: ${(p) => p.alwaysOn.includes('border') ? 1 : 0};
  }
  ${OverlayIcon} {
    opacity: ${(p) => p.alwaysOn.includes('icon') ? 1 : 0};
  }

  ${OverlayButton},
  ${OverlayCaption},
  ${OverlayIcon} {
    transition: opacity ${tSpeed} ease-in;
  }

  &:hover {
    border: 1px solid rgba(${(p) => p.rgb});
    outline: 3px solid rgba(${(p) => p.rgb}, 0.5);
    ${OverlayButton},
    ${OverlayCaption},
    ${OverlayFlourish},
    ${OverlayIcon} {
      opacity: 1;
    }
  }
`;

const loadingCss = css`
  position: absolute;
  left: calc(50% - 30px);
  top: 50%;
`;

const CrewCard = ({ config = { alwaysOn: [] }, crew, onClick }) => {
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const imageUrl = crew.crewCollection
    ? `${process.env.REACT_APP_IMAGES_URL}/v1/crew/${crew.i}/image.svg?bustOnly=true`
    : silhouette;
  return (
    <Card {...config} onClick={onClick}>
      <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
      <CardImage visible={imageLoaded}>
        <img src={imageUrl} onLoad={() => setImageLoaded(true)} />
      </CardImage>
      <CardHeader>
        <CrewName>
          {crew.name || `Crew Member #${crew.i}`}
          <ClassBadge crewClass={toCrewClass(crew.crewClass)}> &#9679;</ClassBadge>
        </CrewName>
        <DataReadout label="Class" style={{ fontSize: 11 }}>{toCrewClass(crew.crewClass) || 'Unknown Class'}</DataReadout>
      </CardHeader>
      <CardOverlay {...config}>
        {config.icon && <OverlayIcon>{config.icon}</OverlayIcon>}
        <div style={{ flex: 1 }} />
        {config.caption && <OverlayCaption>{config.caption}</OverlayCaption>}
        {config.button && <OverlayButton>{config.button}</OverlayButton>}
        <OverlayFlourish />
      </CardOverlay>
    </Card>
  );
};

export default CrewCard;