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
  border-radius: 24px;
  background-color: ${p => {
    const inactiveColor = p.lessTransparent ? `rgba(0,0,0,0.33)` : 'transparent';
    return p.active ? p.theme.colors.main : inactiveColor;
  }};
  color: ${p => p.active ? 'white' : (p.color || p.theme.colors.main)};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 14px;
  padding: 5px 25px;
  pointer-events: auto;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  transition: all 300ms ease;

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
    background-color: rgba(54, 167, 205, 0.25);
    color: white;
  }

  &:active {
    background-color: ${p => p.theme.colors.main};
    color: white;
  }

  &:disabled:hover {
    background-color: transparent;
    color: ${p => p.theme.colors.disabledText};
  }

  & > * {
    margin-right: 5px;
  }
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
  const {
    onClick,
    'data-tip': dataTip,
    'data-place': dataPlace,
    loading,
    setRef,
    ...restProps } = props;
  const playSound = useStore(s => s.dispatchSoundRequested);

  const _onClick = (e) => {
    playSound('effects.click');
    if (onClick) onClick(e);
  }

  useEffect(() => ReactTooltip.rebuild(), []);

  if (setRef) restProps.ref = setRef;
  return (
    <StyledButton
      onClick={_onClick}
      data-tip={dataTip}
      data-place={dataPlace || "right"}
      key={dataTip}
      {...restProps}>
      {loading && <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />}
      {props.children}
      {props.badge && (
        <StyledBadge value={props.badge} />
      )}
    </StyledButton>
  );
};

export default Button;
