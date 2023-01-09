import { useEffect } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import LoadingAnimation from 'react-spinners/BarLoader';

import useStore from '~/hooks/useStore';
import Badge from '~/components/Badge';
import theme from '~/theme';

const StyledButton = styled.button`
  background: transparent;
  border: 1px solid ${p => p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 9.5px),
    calc(100% - 9.5px) 100%,
    0 100%
  );
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 16px;
  padding: 3px; /* must match loadingCss.top */
  pointer-events: auto;
  position: relative;
  text-transform: uppercase;
  transition: all 300ms ease;
  width: 185px;

  & > svg {
    max-height: 24px;
    max-width: 24px;
  }

  ${p => p.disabled
    ? `
      color: rgba(255, 255, 255, 0.7);
      cursor: ${p.theme.cursors.default};
      border-color: ${p.theme.colors.disabledText};
      & > div {
        background-color: ${p.disabledColor || '#222'};
      }
      & > svg {
        stroke: ${p.theme.colors.disabledText};
      }
    `
    : `
      color: white;
      & > div {
        background-color: ${p.color || (p.isTransaction ? '#232d64' : '#1a404f')};
      }
      &:active > div {
        background-color: ${p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main};
      }
      &:hover > div {
        background-color: ${p.isTransaction ? 'rgba(53, 80, 228, 0.75)' : 'rgba(54, 167, 205, 0.25)'};
      }
    `
  }
`;

const InnerContainer = styled.div`
  align-items: center;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 6.5px),
    calc(100% - 6.5px) 100%,
    0 100%
  );
  display: flex;
  justify-content: center;
  min-height: 32px;
  transition: background-color 300ms ease;
  width: 100%;

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
  stroke: ${p => p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)};
  stroke-width: 1.5px;
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
  top: 3px;
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
      {...restProps}>
      <InnerContainer>
        {loading && <LoadingAnimation height={1} color={theme.colors.main} css={loadingCss} />}
        {props.children}
        {props.badge && <StyledBadge value={props.badge} />}
      </InnerContainer>
      <Corner viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" color={props.color} isTransaction={props.isTransaction}>
        <line x1="0" y1="10" x2="10" y2="0" />
      </Corner>
    </StyledButton>
  );
};

export default Button;
