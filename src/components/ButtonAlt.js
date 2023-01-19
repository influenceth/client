import { useEffect } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import LoadingAnimation from 'react-spinners/BarLoader';

import useStore from '~/hooks/useStore';
import Badge from '~/components/Badge';
import theme, { getContrastText } from '~/theme';

const getColor = () => {
  console.log('getting color');
  return 'white';
};

const InnerContainer = styled.div`
  align-items: center;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${p => p.sizeParams.line - 3.5}px),
    calc(100% - ${p => p.sizeParams.line - 3.5}px) 100%,
    0 100%
  );
  display: flex;
  justify-content: center;
  transition: background-color 300ms ease;
  width: 100%;

  & > * {
    margin-right: 5px;
  }
`;

const StyledButton = styled.button`
  background: transparent;
  border: 1px solid ${p => p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${p => p.sizeParams.line - 0.5}px),
    calc(100% - ${p => p.sizeParams.line - 0.5}px) 100%,
    0 100%
  );
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: ${p => p.sizeParams.font}px;
  padding: 3px; /* must match loadingCss.top */
  pointer-events: auto;
  position: relative;
  text-transform: uppercase;
  transition: all 300ms ease;
  width: ${p => p.sizeParams.width}px;

  & > svg {
    max-height: 24px;
    max-width: 24px;
  }

  & ${InnerContainer} {
    min-height: ${p => p.sizeParams.height}px;
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
      color: ${p.color ? getContrastText(p.color) : 'white'};
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

const Corner = styled.svg`
  bottom: -1px;
  height: ${p => p.sizeParams.line}px;
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${p => p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)};
  stroke-width: 1.5px;
  width: ${p => p.sizeParams.line}px;
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

const sizes = {
  medium: { font: 16, height: 32, width: 185, line: 10 },
  large: { font: 20, height: 50, width: 250, line: 15 }
};

const Button = (props) => {
  const {
    'data-place': dataPlace,
    'data-tip': dataTip,
    loading,
    onClick,
    setRef,
    ...restProps } = props;

  const playSound = useStore(s => s.dispatchSoundRequested);
  const sizeParams = sizes[props.size] || sizes.medium;

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
      sizeParams={sizeParams}
      {...restProps}>
      <InnerContainer sizeParams={sizeParams}>
        {loading && (
          <LoadingAnimation
            color={props.color
              ? getContrastText(props.color)
              : (props.isTransaction ? 'rgb(73, 100, 248)' : theme.colors.main)}
            css={loadingCss}
            height={1} />
        )}
        {props.children}
        {props.badge && <StyledBadge value={props.badge} />}
      </InnerContainer>
      <Corner
        color={props.color}
        isTransaction={props.isTransaction}
        sizeParams={sizeParams}
        viewBox={`0 0 ${sizeParams.line} ${sizeParams.line}`}
        xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1={sizeParams.line} x2={sizeParams.line} y2="0" />
      </Corner>
    </StyledButton>
  );
};

export default Button;
