import { useCallback, useEffect, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Permission } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import useChainTime from '~/hooks/useChainTime';
import { formatTimer, nativeBool, reactBool } from "~/lib/utils";
import { hexToRGB } from '~/theme';

const dimension = 60;
const padding = 4;
const cornerSize = 10;

const borderAnimation = keyframes`
  0% { border-width: 1px; padding: ${padding}px; }
  50% { border-width: 3px; padding: ${padding - 2}px; }
  100% { border-width: 1px; padding: ${padding}px; }
`;

// (see ClipCorner for these values)
const cornerAnimation = keyframes`
  0% { stroke-width: 2px; bottom: -1px; right: -1px; }
  50% { stroke-width: 3px; bottom: -2px; right: -2px; }
  100% { stroke-width: 2px; bottom: -1px; right: -1px; }
`;

const rotationAnimation = keyframes`
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
`;

const ActionButtonWrapper = styled.div`
  color: ${p => p.overrideColor || p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  display: inline-block;
  margin-right: 8px;
  pointer-events: all;
  position: relative;

  ${p => p?.badge
    ? `
      &:before {
        background-color: ${p.overrideColor || p.theme.colors.main};
        content: "${p.badge}";
        color: white;
        border-radius: 2em;
        font-size: 12px;
        font-weight: bold;
        line-height: 20px;
        position: absolute;
        text-align: center;
        top: -8px;
        right: -6px;
        height: 20px;
        width: 20px;
        z-index: 1;
      }
    `
    : `
      &:last-child {
        margin-right: 0;
      }
    `
  }

  ${p => p.attention && css`
    color: ${p.theme.colors.success};
    &:before {
      background-color: ${p => p.theme.colors.success};
    }
  `}

  ${p => p.disabled && css`
    color: #aaa;
    &:before {
      background-color: #777;
    }
  `}
`;

const ActionButton = styled.div`
  border: 1px solid ${p => p.overrideColor || p.theme.colors.main};
  ${p => p.theme.clipCorner(cornerSize)};
  height: ${dimension}px;
  width: ${dimension}px;
  padding: ${padding}px;
  position: relative;
  transition: color 250ms ease;
  & > svg {
    stroke: ${p => p.overrideColor || p.theme.colors.main} !important;
  }

  & > div {
    align-items: center;
    background-color: rgba(${p => p.overrideColor ? hexToRGB(p.overrideColor) : p.theme.colors.mainRGB}, 0.2);
    ${p => p.theme.clipCorner(cornerSize - 4)};
    display: flex;
    font-size: 55px;
    height: 100%;
    justify-content: center;
    overflow: hidden;
    position: relative;
    transition: background-color 250ms ease;
    width: 100%;
    & > span {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
    }
  }

  ${p => p.active && !p.disabled && `
    & > div {
      background-color: ${p.overrideColor || p.theme.colors.main};
      color: rgba(0, 0, 0, 0.8);
    }
  `}

  ${p => p.attention ? css`
    animation: ${borderAnimation} 800ms ease-out infinite;
    border-color: ${p.theme.colors.success};
    & > div {
      background-color: rgba(${p.theme.colors.successRGB}, 0.2);
    }
    &:before {
      background-color: ${p => p.theme.colors.success};
    }
    &:hover {
      & > div {
        background-color: rgba(${p.theme.colors.successRGB}, 0.4) !important;
      }
    }
    & > svg {
      animation: ${cornerAnimation} 800ms ease-out infinite;
      stroke: ${p.theme.colors.success} !important;
    }
  ` : ''}

  ${p => p.loading && `
    & > div > svg {
      opacity: 0.25;
    }
  `}

  ${p => p.disabled
    ? `
      border-color: #444;
      cursor: ${p.theme.cursors.default};
      opacity: 0.75;
      & > div {
        background-color: rgba(0, 0, 0, 0.5);
      }
      &:before {
        background-color: #777;
      }
      & > svg {
        stroke: #444 !important;
      }
    `
    : `
      &:hover {
        color: white;
        & > div {
          background-color: rgba(${p.overrideColor ? hexToRGB(p.overrideColor) : p.theme.colors.mainRGB}, 0.4);
        }
      }
    `
  }
`;

const LoadingAnimation = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    0 100%,
    0 0,
    ${padding}px ${padding}px,
    ${padding}px calc(100% - ${padding}px),
    calc(100% - ${cornerSize + padding - 1}px) calc(100% - ${padding}px),
    calc(100% - ${padding}px) calc(100% - ${cornerSize + padding - 1}px),
    calc(100% - ${padding}px) ${padding}px,
    ${padding}px ${padding}px
  );

  &:before {
    animation: ${rotationAnimation} 4000ms linear infinite;
    background: currentColor;
    content: '';
    height: 100%;
    width: 200%;
    opacity: 0.75;
    position: absolute;
    left: -50%;
    bottom: 50%;
    transform-origin: bottom center;
  }
`;

const CompletionTime = styled.label`
  align-items: center;
  display: flex;
  font-weight: bold;
  position: absolute;
  justify-content: center;
  text-shadow: 0px 0px 1px black;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`;

// TODO: consider a booleanProp wrapper so could wrap boolean props in
// {...booleanProps({ a, b, c })} where booleanProps(props) would either include
// or not rather than true/false OR would pass 1/0 instead

const LoadingTimer = ({ finishTime }) => {
  const chainTime = useChainTime();
  const timeLeft = finishTime - chainTime;
  return (
    <CompletionTime>
      {timeLeft > 0 ? formatTimer(timeLeft, 1) : '...'}
    </CompletionTime>
  );
};

const ActionButtonComponent = ({ label, labelAddendum, flags = {}, icon, onClick, ...props }) => {
  const _onClick = useCallback(() => {
    if (!flags?.disabled && onClick) onClick();
  }, [flags, onClick]);

  const safeFlags = useMemo(() => {
    return Object.keys(flags).reduce((acc, k) => {
      if (k === 'badge') acc[k] = flags[k];
      else acc[k] = k === 'disabled' ? nativeBool(flags[k]) : reactBool(flags[k]);
      return acc;
    }, {})
  }, [flags]);

  useEffect(() => ReactTooltip.rebuild(), []);
  return (
    <ActionButtonWrapper
      data-arrow-color="transparent"
      data-for="global"
      data-place="top"
      data-tip={`${label}${labelAddendum ? ` (${labelAddendum})` : ''}`}
      onClick={_onClick}
      {...safeFlags}
      {...props}>
      {flags.loading && <LoadingAnimation />}
      <ActionButton {...safeFlags} overrideColor={props.overrideColor}>
        <ClipCorner dimension={cornerSize} />
        <div>{icon}</div>
        {flags.loading && <LoadingTimer finishTime={flags.finishTime} />}
      </ActionButton>
    </ActionButtonWrapper>
  );
}

export const getCrewDisabledReason = ({ asteroid, crew, permission, permissionTarget, requireAsteroid = true, requireSurface = true }) => {
  if (!crew?._launched) return 'not yet launched';
  if (permission && permissionTarget) {
    if (!crew || !Permission.isPermitted(crew, permission, permissionTarget)) return 'access restricted';
  }
  if (asteroid && requireAsteroid) {
    if (crew?._location?.asteroidId !== asteroid?.id) {
      return 'crew is away';
    } else if (requireSurface && !crew?._location?.lotId) {
      return 'crew is in orbit';
    }
  }
  if (!crew?._ready) return 'crew is busy';
  return null;
};

export default ActionButtonComponent;