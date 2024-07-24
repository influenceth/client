import styled, { css, keyframes } from 'styled-components';
import { Address } from '@influenceth/sdk';

import CrewmateCard, { CrewCaptainCard } from '~/components/CrewmateCard';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import { CaptainIcon } from '~/components/Icons';
import TriangleTip from '~/components/TriangleTip';
import theme, { hexToRGB } from '~/theme';

const bgColor = '#000';
const hoverBgColor = '#183541';
const warningBorderColor = `rgba(${hexToRGB(theme.colors.error)}, 0.4)`;
const defaultBorderColor = '#444';
const tween = '250ms ease';

const silhouetteAnimation = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
`;

const Avatar = styled.div`
  background: ${bgColor};
  border: solid ${p => p.borderColor};
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
    const iconWidth = (p.lessPadding ? 58 : 63) * widthMult;
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

export const EmptyCrewmateCardFramed = styled.div`
  border: 1px solid ${p => p.borderColor || `rgba(${p.theme.colors.mainRGB}, 0.4)`};
  background: black;
  padding: 3px;
  position: relative;
  width: ${p => p.width || 96}px;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.05);
    display: block;
    height: 0;
    padding-top: ${p => p.hideHeader ? '128' : '137.5'}%;
    width: 100%;
  }
  & > svg {
    color: ${p => (p.onClick) ?  p.theme.colors.main : p.theme.colors.disabledButton};
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

const CrewmateCardAbstract = ({
  borderColor,
  children,
  CardProps,
  isCaptain,
  isEmpty,
  onClick,
  setRef,
  silhouetteOverlay,
  tooltip,
  tooltipPlace = 'right',
  width,
  ...props
}) => {
  const cardWidth = width || 96;
  return (
    <AvatarWrapper
      data-tooltip-content={tooltip}
      data-tooltip-id="globalTooltip"
      data-tooltip-place={tooltipPlace}
      clickable={!!onClick}
      onClick={onClick || noop}
      ref={setRef}
      width={cardWidth}
      {...props}>
      <Avatar isEmpty={isEmpty} borderColor={borderColor || defaultBorderColor} {...props}>
        {!isEmpty && children}
        {isEmpty && (
          <CrewSilhouetteCard overlay={silhouetteOverlay} {...CardProps} />
        )}
      </Avatar>
      <AvatarFlourish>
        {!props.noArrow && (
          <>
            {isCaptain && <StyledCaptainIcon isEmpty={isEmpty} />}
            <StyledTriangleTip
              fillColor={bgColor}
              strokeColor={borderColor || defaultBorderColor}
              strokeWidth={width > 160 ? 1 : 2} />
          </>
        )}
      </AvatarFlourish>
    </AvatarWrapper>
  );
};

const CrewmateCardFramed = ({
  borderColor,
  CrewmateCardProps = {},
  warnIfNotOwnedBy,
  crewmate,
  ...props
}) => {
  if (props.width) CrewmateCardProps.width = props.width;
  if (props.height) CrewmateCardProps.height = props.height;
  const finalBorderColor = crewmate && warnIfNotOwnedBy && !Address.areEqual(crewmate?.Nft?.owner, warnIfNotOwnedBy)
    ? warningBorderColor
    : (borderColor || defaultBorderColor);
  return (
    <CrewmateCardAbstract
      borderColor={finalBorderColor}
      CardProps={CrewmateCardProps}
      isEmpty={!crewmate}
      {...props}>
      <CrewmateCard
        crewmate={crewmate}
        hideHeader
        hideFooter
        hideMask
        {...CrewmateCardProps} />
    </CrewmateCardAbstract>
  );
};

export const CrewCaptainCardFramed = ({
  CrewmateCardProps = {},
  crewId,
  ...props
}) => {
  if (props.width) CrewmateCardProps.width = props.width;
  if (props.height) CrewmateCardProps.height = props.height;

  return (
    <CrewmateCardAbstract
      CardProps={CrewmateCardProps}
      isCaptain
      isEmpty={!crewId}
      {...props}>
      <CrewCaptainCard
        crewId={crewId}
        hideHeader
        hideFooter
        hideMask
        {...CrewmateCardProps} />
    </CrewmateCardAbstract>
  );
};

export default CrewmateCardFramed;