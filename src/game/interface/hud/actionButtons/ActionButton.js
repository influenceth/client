import { useCallback, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import ClipCorner from '~/components/ClipCorner';
import InProgressIcon from '~/components/InProgressIcon';
import NavIcon from '~/components/NavIcon';

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

const ActionButtonWrapper = styled.div`
  color: ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  margin-right: 8px;
  pointer-events: all;
  position: relative;

  &:last-child {
    margin-right: 0;
  }

  ${p => p?.badge ? `
    &:before {
      background-color: ${p.theme.colors.main};
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
  ` : ''}

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

const loadingHeight = 12;
const LoadingAnimation = styled.div`
  position: absolute;
  top: -${0.5 * loadingHeight + 2}px;
  left: 50%;
  margin-left: -${1.5 * loadingHeight}px;
  z-index: 1;
`;

const ActionButton = styled.div`
  border: 1px solid ${p => p.theme.colors.main};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    0 100%
  );
  height: ${dimension}px;
  width: ${dimension}px;
  padding: ${padding}px;
  position: relative;
  transition: color 250ms ease;
  & > svg {
    stroke: ${p => p.theme.colors.main} !important;
  }

  & > div {
    align-items: center;
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.2);
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - ${cornerSize - 4}px),
      calc(100% - ${cornerSize - 4}px) 100%,
      0 100%
    );
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
          background-color: rgba(${p.theme.colors.mainRGB}, 0.4);
        }
      }
    `
  }
`;

// TODO: consider a booleanProp wrapper so could wrap boolean props in
// {...booleanProps({ a, b, c })} where booleanProps(props) would either include
// or not rather than true/false OR would pass 1/0 instead

const ActionButtonComponent = ({ label, flags = {}, icon, onClick }) => {
  const _onClick = useCallback(() => {
    if (!flags?.disabled && onClick) onClick();
  }, [flags, onClick]);
  useEffect(() => ReactTooltip.rebuild(), []);
  return (
    <ActionButtonWrapper
      data-arrow-color="transparent"
      data-for="global"
      data-place="top"
      data-tip={label}
      onClick={_onClick}
      {...flags}>
      {flags.loading && <LoadingAnimation><InProgressIcon height={loadingHeight} /></LoadingAnimation>}
      <ActionButton {...flags}>
        <ClipCorner dimension={cornerSize} />
        <div>
          {icon}
        </div>
      </ActionButton>
    </ActionButtonWrapper>
  );
}

export default ActionButtonComponent;