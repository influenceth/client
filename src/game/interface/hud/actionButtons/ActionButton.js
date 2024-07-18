import { useCallback, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Permission } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import useSyncedTime from '~/hooks/useSyncedTime';
import { formatTimer, nativeBool, reactBool } from "~/lib/utils";
import { hexToRGB } from '~/theme';
import useCrewContext from '~/hooks/useCrewContext';

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

  ${p => p.attention && !p.disabled && css`
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

const CornerBadge = styled.span`
  background: #0f365c;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  color: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  height: 28px;
  left: 0;
  line-height: 12px;
  padding: 2px 0 0 2px;
  position: absolute;
  top: 0;
  width: 28px;
  z-index: 1;
`;

const CompletionTime = styled.label`
  align-items: center;
  bottom: 0;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  font-weight: bold;
  left: 0;
  position: absolute;
  justify-content: center;
  right: 0;
  filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5));
  transition: color 100ms ease;
  top: 0;
`;

const ActionButton = styled.div`
  border: 1px solid ${p => p.overrideColor || p.theme.colors.main};
  ${p => p.theme.clipCorner(cornerSize)};
  height: ${dimension}px;
  width: ${dimension}px;
  padding: ${padding}px;
  position: relative;
  transition: color 100ms ease;
  & > svg {
    stroke: ${p => p.overrideColor || p.theme.colors.main} !important;
  }

  & > div {
    align-items: center;
    background-color: rgba(${p => p.overrideBgColor ? hexToRGB(p.overrideBgColor) : (p.overrideBgColor ? hexToRGB(p.overrideBgColor) : hexToRGB(p.theme.colors.darkMain))}, 0.5);
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

  ${p => p.attention && !p.disabled ? css`
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
      & ${CornerBadge} {
        filter: saturate(0);
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

// TODO: consider a booleanProp wrapper so could wrap boolean props in
// {...booleanProps({ a, b, c })} where booleanProps(props) would either include
// or not rather than true/false OR would pass 1/0 instead

const LoadingTimer = ({ finishTime }) => {
  const syncedTime = useSyncedTime();
  return (
    <CompletionTime>
      {finishTime > syncedTime ? formatTimer(finishTime - syncedTime, 1) : '...'}
    </CompletionTime>
  );
};

const StackTally = ({ tally }) => {
  return (
    <CompletionTime>
      {tally > 1 ? `x${tally}` : ``}
    </CompletionTime>
  );
};

// (children used for mouseinfopane)
const ActionButtonComponent = ({
  children,
  label,
  labelAddendum: rawLabelAddendum,
  flags: rawFlags,
  icon,
  enablePrelaunch,
  onClick,
  sequenceMode,
  ...props
}) => {
  const { isLaunched } = useCrewContext();

  const [flags, labelAddendum] = useMemo(() => {
    const f = rawFlags || {};
    let l = rawLabelAddendum;
    if (!enablePrelaunch && !isLaunched) {
      f.disabled = true;
      l = 'not yet launched';
    }
    return [f, l];
  }, [enablePrelaunch, isLaunched, rawFlags, rawLabelAddendum]);

  const _onClick = useCallback(() => {
    if (!flags?.disabled && onClick) onClick();
  }, [flags?.disabled, onClick]);

  const safeFlags = useMemo(() => {
    return Object.keys(flags).reduce((acc, k) => {
      if (k === 'badge') acc[k] = flags[k];
      else acc[k] = k === 'disabled' ? nativeBool(flags[k]) : reactBool(flags[k]);
      return acc;
    }, {})
  }, [flags]);

  return (
    <ActionButtonWrapper
      data-arrow-color="transparent"
      data-tooltip-id="globalTooltip"
      data-tooltip-place="top"
      data-tooltip-delay-hide={100}
      data-tooltip-content={`${label}${labelAddendum ? ` (${labelAddendum})` : ''}`}
      onClick={_onClick}
      {...safeFlags}
      {...props}>
      {flags.loading && <LoadingAnimation />}
      <ActionButton {...safeFlags} overrideColor={props.overrideColor} overrideBgColor={props.overrideBgColor}>
        <ClipCorner dimension={cornerSize} />
        {sequenceMode && !safeFlags.disabled && !flags.loading && <CornerBadge>+</CornerBadge>}
        <div style={{ opacity: flags.tally > 1 ? 0.33 : 1 }}>{icon}</div>
        {flags.tally > 1 && <StackTally tally={flags.tally} />}
        {!(flags.tally > 1) && flags.loading && <LoadingTimer finishTime={flags.finishTime} />}
      </ActionButton>
      {children}
    </ActionButtonWrapper>
  );
}

export const getCrewDisabledReason = ({
  asteroid,
  crew,
  isSequenceable = false,
  permission,
  permissionTarget,
  requireAsteroid = true,
  requireSurface = true,
  requireReady = true
}) => {
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
  if (!!crew._actionTypeTriggered) return 'crew event pending';
  if (requireReady && isSequenceable && !crew?._readyToSequence) return 'crew is fully scheduled';
  if (requireReady && !isSequenceable && !crew?._ready) return 'crew is busy';
  return null;
};

export default ActionButtonComponent;