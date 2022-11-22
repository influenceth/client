import { useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import LoadingAnimation from 'react-spinners/BarLoader';

const outlineAnimation = keyframes`
  0% { outline-width: 0; }
  50% { outline-width: 3px; }
  100% { outline-width: 0; }
`;

const ActionButton = styled.div`
  background: #111;
  border: 1px solid ${p => p.theme.colors.main};
  border-radius: 6px;
  color: ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  height: 64px;
  margin-left: 8px;
  padding: 3px;
  pointer-events: all;
  position: relative;
  transition: color 250ms ease;
  width: 64px;
  &:first-child {
    margin-left: 0;
  }
  & > div {
    align-items: center;
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.2);
    border-radius: 3px;
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

  ${p => p?.badge && `
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
      right: -8px;
      height: 20px;
      width: 20px;
      z-index: 1;
    }
  `}

  ${p => p.attention && css`
    animation: ${outlineAnimation} 800ms ease-out infinite;
    border-color: ${p.theme.colors.success};
    color: ${p.theme.colors.success};
    outline: 0 solid ${p.theme.colors.success};
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
  `}

  ${p => p.disabled
    ? `
      border-color: #777;
      color: #777;
      cursor: ${p.theme.cursors.default};
      opacity: 0.75;
      & > div {
        background-color: rgba(50, 50, 50, 0.2);
      }
      &:before {
        background-color: #777;
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

const ActionButtonComponent = ({ label, flags = {}, icon, onClick }) => {
  const _onClick = useCallback(() => {
    if (!flags?.disabled && onClick) onClick();
  }, [flags, onClick]);
  return (
    <ActionButton
      data-arrow-color="transparent"
      data-for="global"
      data-place="top"
      data-tip={label}
      onClick={_onClick}
      {...flags}>
      <div>
        {icon}
        {flags.loading && <LoadingAnimation color="white" height="1" />}
      </div>
    </ActionButton>
  );
}

export default ActionButtonComponent;