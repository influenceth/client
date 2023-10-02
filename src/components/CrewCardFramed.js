import styled, { css, keyframes } from 'styled-components';

import CrewCard from '~/components/CrewCard';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import { CaptainIcon } from '~/components/Icons';
import TriangleTip from '~/components/TriangleTip';

const bgColor = '#000';
const hoverBgColor = '#183541';
const defaultBorderColor = '#444';
const tween = '250ms ease';

const silhouetteAnimation = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
`;

const Avatar = styled.div`
  background: ${bgColor};
  border: solid ${p => p.borderColor || defaultBorderColor};
  border-width: ${p => p.noArrow ? '1px' : '1px 1px 0'};
  overflow: hidden;
  pointer-events: auto;
  transition: background ${tween}, border-color ${tween};

  & > div {
    ${p => p.isEmpty && !p.noAnimation
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
    const iconWidth = p.lessPadding ? 58 * widthMult : 67 * widthMult;
    const fontSize = iconWidth * 17 / 67;
    return `
      width: ${p.width}px;
      ${Avatar} {
        padding: ${p.lessPadding ? 0 : `${3 * widthMult}px`};
      }
      ${StyledCaptainIcon} {
        font-size: ${fontSize}px;
        margin-left: ${-iconWidth / 2.58}px;
        top: ${(p.lessPadding ? 1 : -2) * widthMult}px;
      }
      ${StyledTriangleTip} {
        height: ${20 * widthMult}px;
      }
    `;
  }}

  ${p => p.clickable && `
    &:hover {
      ${Avatar} {
        background: ${hoverBgColor};
        border-color: ${p.theme.colors.main};
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
          stroke: ${p.theme.colors.main};
        }
      }
    }
  `}
`;

export const EmptyCrewCardFramed = styled.div`
  border: 1px solid ${p => p.borderColor || `rgba(${p.theme.colors.mainRGB}, 0.4)`};
  background: black;
  padding: 4px;
  position: relative;
  width: ${p => p.width || 96}px;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.13);
    display: block;
    height: 0;
    padding-top: ${p => p.hideHeader ? '128' : '137.5'}%;
    width: 100%;
  }
  & > svg {
    color: ${p => p.theme.colors.main};
    opacity: 0.5;
    position: absolute;
    top: calc(50% - 35px);
    left: calc(50% - 35px);
    font-size: 70px;
    line-height: 70px;
    transition: opacity 250ms ease;
  }
  ${p => p.onClick && `
    cursor: ${p => p.theme.cursors.active};
    transition: background 250ms ease, border-color 250ms ease;
    &:hover {
      background: #183541;
      border-color: ${p => p.theme.colors.main};
      & > svg { opacity: 0.75; }
    }
  `}
`;

const noop = () => {};
const CrewCardFramed = ({
  crewmate,
  crewCardProps = {},
  isCaptain,
  onClick,
  silhouetteOverlay,
  tooltip,
  width,
  ...props
}) => {
  const cardWidth = width || 96;
  return (
    <AvatarWrapper
      data-tip={tooltip}
      data-for="global"
      data-place="right"
      clickable={!!onClick}
      onClick={onClick || noop}
      width={cardWidth}
      {...props}>
      <Avatar isEmpty={!crewmate} {...props}>
        {crewmate && (
          <CrewCard
            crewmate={crewmate}
            hideHeader
            hideFooter
            hideMask
            {...crewCardProps} />
        )}
        {!crewmate && (
          <CrewSilhouetteCard overlay={silhouetteOverlay} {...crewCardProps} />
        )}
      </Avatar>
      <AvatarFlourish>
        {isCaptain && <StyledCaptainIcon isEmpty={!crewmate} />}
        {!props.noArrow && (
          <StyledTriangleTip
            fillColor={bgColor}
            strokeColor={props.borderColor || defaultBorderColor}
            strokeWidth={2} />
        )}
      </AvatarFlourish>
    </AvatarWrapper>
  );
};

export default CrewCardFramed;