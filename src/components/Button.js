import { useEffect } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import LoadingAnimation from 'react-spinners/BarLoader';

import useStore from '~/hooks/useStore';
import Badge from '~/components/Badge';
import theme from '~/theme';

const StyledButton = styled.button`
  align-items: center;
  border: 1px solid ${p => p.color || p.theme.colors.main};
  background-color: ${p => {
    const inactiveColor = p.lessTransparent ? `rgba(0,0,0,0.33)` : 'transparent';
    return p.active ? p.theme.colors.main : inactiveColor;
  }};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 9.5px),
    calc(100% - 9.5px) 100%,
    0 100%
  );
  color: ${p => p.active ? 'white' : (p.color || p.theme.colors.main)};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  margin-top: 15px;
  min-height: 35px;
  transition: all 300ms ease;
  padding: 0 15px 0 10px;
  position: relative;
  min-width: 75px;
  width: 175px;

  & > svg {
    max-height: 24px;
    max-width: 24px;
  }

  &:disabled {
    color: ${p => p.theme.colors.disabledText};
    border-color: ${p => p.theme.colors.disabledText};

    & > svg {
      stroke: ${p => p.theme.colors.disabledText};
    }
  }

  &:hover {
    /*background-image: linear-gradient(120deg, rgba(54, 167, 205, 0.1), rgba(54, 167, 205, 0.25));*/
    background-color: rgba(54, 167, 205, 0.25);
    color: white;
  }

  &:active {
    background-color: ${p => p.theme.colors.main};
    color: white;
  }

  &:disabled:hover {
    /*background-image: none;*/
    background-color: transparent;
    color: ${p => p.theme.colors.disabledText};
  }

  & > * {
    margin-right: 5px;
  }
`;

const Corner = styled.svg`
  bottom: -1px;
  height: 10px;
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${p => p.color || p.theme.colors.main};
  stroke-width: 1px;
  width: 10px;
`;

const StyledBadge = styled(Badge)`
  font-size: 80%;
  margin-left: 12px;
  margin-right: -6px;
`;

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
`;

const Button = (props) => {
  const { onClick, 'data-tip': dataTip, 'data-place': dataPlace, loading, ...restProps } = props;
  const playSound = useStore(s => s.dispatchSoundRequested);

  const _onClick = (e) => {
    playSound('effects.click');
    if (onClick) onClick(e);
  }

  useEffect(() => ReactTooltip.rebuild(), []);

  return (
    <StyledButton {...restProps} onClick={_onClick} data-tip={dataTip} data-place={dataPlace || "right"} key={dataTip}>
      {loading && <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />}
      {props.children}
      {props.badge && (
        <StyledBadge value={props.badge} />
      )}
      <Corner viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" color={props.color}>
        <line x1="0" y1="10" x2="10" y2="0" />
      </Corner>
    </StyledButton>
  );
};

export default Button;
