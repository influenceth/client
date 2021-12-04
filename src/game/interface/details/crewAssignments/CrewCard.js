import { useState } from 'react';
import LoadingAnimation from 'react-spinners/PuffLoader';
import styled, { css, keyframes } from 'styled-components';
import { toCrewClass } from 'influence-utils';

import silhouette from '~/assets/images/silhouette.png';
import AttentionDot from '~/components/AttentionDot';
import CrewClassBadge from '~/components/CrewClassBadge';
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
  text-align: left;
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
  padding-top: 137.5%;
  position: relative;
  width: 100%;

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
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    font-size: 85%;
  }
`;

const AttentionIcon = styled(AttentionDot)`
  position: absolute;
  left: 8px;
  top: 50%;
  margin-top: -6px;
`;

const OverlayButton = styled.div`
  background-color: transparent;
  font-weight: bold;
  margin-bottom: 12px;
  padding: 4px;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0px 0px 3px black;
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

const CardOverlayHoverCss = css`
  border: 1px solid rgba(${(p) => p.rgbHover || p.rgb});
  outline: 3px solid rgba(${(p) => p.rgbHover || p.rgb}, 0.5);
  ${OverlayButton},
  ${OverlayCaption},
  ${OverlayFlourish},
  ${OverlayIcon} {
    opacity: 1;
  }

  ${p => p.rgbHover && `
    color: rgb(${p.rgbHover});
    ${OverlayButton} {
      background-color: rgba(${p.rgbHover}, 0.3);
      color: rgb(${p.rgbHover});
    }
    ${OverlayFlourish} {
      border-bottom-color: rgb(${p.rgbHover});
    }
  `}
`;

const buttonKeyframes = (rgb, isAnimated) => keyframes`
  0% {
    background-color: rgba(${rgb}, 0.3);
    color: rgba(${rgb}, 1.0);
  }
  50% {
    background-color: rgba(${rgb}, 0.2);
    color: rgba(${rgb}, 0.7);
  }
  100% {
    background-color: rgba(${rgb}, 0.3);
    color: rgba(${rgb}, 1.0);
  }
`;

// this ensures that keyframes are always inserted even though only conditionally used below
css`
  animation: ${buttonKeyframes('255, 255, 255')} 1000ms linear infinite;
`;

const CardOverlay = styled(CardLayer)`
  align-items: center;
  border: 1px solid ${(p) => p.alwaysOn.includes('border') ? `rgb(${(p) => p.rgb})` : 'transparent'};
  outline: 3px solid ${(p) => p.alwaysOn.includes('border') ? `rgba(${(p) => p.rgb}, 0.5)` : 'transparent'};
  color: rgb(${(p) => p.rgb || '255,255,255'});
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-end;
  transition: outline ${tSpeed} ease-in;
  width: 100%;

  ${OverlayButton} {
    ${p => p.buttonAttention ? `animation: ${p => buttonKeyframes(p.rgb)} 1000ms linear infinite;` : ''}
    background-color: rgba(${(p) => p.rgb}, 0.3);
    color: rgb(${(p) => p.rgb});
    opacity: ${(p) => p.alwaysOn.includes('button') ? 1 : 0};
    &:after {
      content: "${p => p.button}";
    }
  }
  ${OverlayCaption} {
    opacity: ${(p) => p.alwaysOn.includes('caption') ? 1 : 0};
  }
  ${OverlayFlourish} {
    border-bottom-color: rgb(${(p) => p.rgb});
    opacity: ${(p) => p.alwaysOn.includes('border') ? 1 : 0};
  }
  ${OverlayIcon} {
    ${(p) => {
      if (p.alwaysOn.includes('icon')) {
        return `
          opacity: 1;
        `;
      }
      return `
        color: ${p.rgbHover ? `rgb(${p.rgbHover})` : 'inherit'};
        opacity: 0;
      `;
    }}
  }

  ${OverlayButton},
  ${OverlayCaption},
  ${OverlayIcon} {
    transition: opacity ${tSpeed} ease-in, color ${tSpeed} ease-in, background-color ${tSpeed} ease-in;
  }

  &:hover {
    ${CardOverlayHoverCss}
    ${OverlayButton} {
      animation: none;
      &:after {
        content: "${p => p.buttonHover || p.button}";
      }
      ${AttentionIcon} {
        display: none;
      }
    }
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    ${(p) => p.rgb && CardOverlayHoverCss}
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
        <img
          alt={crew.name || `Crew Member #${crew.i}`}
          src={imageUrl}
          onLoad={() => setImageLoaded(true)} />
      </CardImage>
      <CardHeader>
        <CrewName>
          {crew.name || `Crew Member #${crew.i}`}
          {' '}<CrewClassBadge crewClass={crew.crewClass} />
        </CrewName>
        <DataReadout label="Class" style={{ fontSize: 11 }}>{toCrewClass(crew.crewClass) || 'Unknown Class'}</DataReadout>
      </CardHeader>
      <CardOverlay {...config}>
        {config.icon && <OverlayIcon>{config.icon}</OverlayIcon>}
        <div style={{ flex: 1 }} />
        {config.caption && <OverlayCaption>{config.caption}</OverlayCaption>}
        {config.button && (
          <OverlayButton>
            {config.buttonAttention && <AttentionIcon size={11} />}
          </OverlayButton>
        )}
        <OverlayFlourish />
      </CardOverlay>
    </Card>
  );
};

export default CrewCard;