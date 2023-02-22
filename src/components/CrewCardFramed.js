import styled, { css, keyframes } from 'styled-components';

import CrewCard from '~/components/CrewCard';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import { CaptainIcon } from '~/components/Icons';
import TriangleTip from '~/components/TriangleTip';

const bgColor = '#000';
const hoverBgColor = '#183541';
const borderColor = '#444';
const tween = '250ms ease';

const silhouetteAnimation = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
`;

const Avatar = styled.div`
  background: ${bgColor};
  border: solid ${borderColor};
  border-width: 1px 1px 0;
  overflow: hidden;
  pointer-events: auto;
  transition: background ${tween}, border-color ${tween};

  & > div {
    ${p => p.isEmpty
      ? css`
        animation: ${silhouetteAnimation} 2000ms linear infinite;
        border: 1px solid ${p => p.theme.colors.main};
      `
      : ''//'margin-top: -8px;'
    }
    transition: opacity ${tween};
  }
`;
const AvatarFlourish = styled.div`
  display: flex;
  pointer-events: auto;
  position: relative;
`;
const StyledTriangleTip = styled(TriangleTip)`
  width: 100%;
  path { transition: stroke ${tween}; }
  polygon { transition: fill ${tween}; }
`;

const StyledCaptainIcon = styled(CaptainIcon)`
  left: 50%;
  position: absolute;
  ${p => p.isEmpty && `
    & * {
      fill: rgba(255, 255, 255, 0.25) !important;
    }
  `}
`;

const AvatarWrapper = styled.div`
  cursor: ${p => p.theme.cursors[p.clickable ? 'active' : 'default']};
  
  ${p => {
    const widthMult = p.width / 96;
    const iconWidth = 67 * widthMult;
    const fontSize = iconWidth * 22 / 67;
    return `
      width: ${p.width}px;
      ${Avatar} {
        padding: ${5 * widthMult}px ${5 * widthMult}px ${8 * widthMult}px;
      }
      ${StyledCaptainIcon} {
        font-size: ${fontSize}px;
        margin-left: ${-iconWidth / 2}px;
        top: ${-7 * widthMult}px;
      }
      ${StyledTriangleTip} {
        height: ${20 * widthMult}px;
      }
    `;
  }}

  &:hover {
    ${Avatar} {
      background: ${hoverBgColor};
      border-color: ${p => p.theme.colors.main};
      & > div {
        animation: none;
        opacity: 1;
      }
    }
    ${StyledTriangleTip} {
      polygon {
        fill: ${hoverBgColor};
      }
      path {
        stroke: ${p => p.theme.colors.main};
      }
    }
  }
`;

const noop = () => {};
const CrewCardFramed = ({
  crewmate,
  isCaptain,
  onClick,
  silhouetteOverlay,
  tooltip,
  width
}) => {
  const cardWidth = width || 96;
  return (
    <AvatarWrapper
      data-tip={tooltip}
      data-for="global"
      data-place="right"
      clickable={!!onClick}
      onClick={onClick || noop}
      width={cardWidth}>
      <Avatar isEmpty={!crewmate}>
        {crewmate && (
          <CrewCard
            crew={crewmate}
            hideHeader
            hideFooter
            hideMask />
        )}
        {!crewmate && (
          <CrewSilhouetteCard overlay={silhouetteOverlay} />
        )}
      </Avatar>
      <AvatarFlourish>
        {isCaptain && <StyledCaptainIcon isEmpty={!crewmate} />}
        <StyledTriangleTip
          fillColor={bgColor}
          strokeColor={borderColor}
          strokeWidth={2} />
      </AvatarFlourish>
    </AvatarWrapper>
  );
};

export default CrewCardFramed;