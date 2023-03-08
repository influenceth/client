import { useContext, useEffect, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import BarLoader from 'react-spinners/BarLoader';
import { uniqueId } from 'lodash';

import useStore from '~/hooks/useStore';
import Badge from '~/components/Badge';
import theme, { getContrastText } from '~/theme';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';

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

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

const StyledButton = styled.button`
  ${p => p.loadingAnimation && css`
    animation: ${opacityAnimation} 1250ms ease infinite;
  `}
  background: transparent;
  border: ${p => p.sizeParams.borderWidth}px solid ${p => p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)};
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
  min-width: ${p => p.sizeParams.width}px;
  padding: 3px; /* must match loadingCss.top */
  pointer-events: auto;
  position: relative;
  text-transform: uppercase;
  transition: all 300ms ease;

  & > svg {
    max-height: 24px;
    max-width: 24px;
  }

  & ${InnerContainer} {
    min-height: ${p => p.sizeParams.height}px;
    padding: 0 10px;
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
      color: ${p.background === 'transparent' ? p.color : (p.color ? getContrastText(p.color) : 'white')};
      & > div {
        background-color: ${p.background || p.color || (p.isTransaction ? '#232d64' : '#1a404f')};
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
  height: ${p => p.sizeParams.line - (p.sizeParams.borderWidth === 1 ? 0 : p.sizeParams.borderWidth - 1)}px;
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${p => p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)};
  stroke-width: ${p => p.sizeParams.borderWidth + 0.5}px;
  width: ${p => p.sizeParams.line - (p.sizeParams.borderWidth === 1 ? 0 : p.sizeParams.borderWidth - 1)}px;
`;

const StyledBadge = styled(Badge)`
  font-size: 80%;
  margin-left: 12px;
  margin-right: -6px;
`;

const DisabledTooltip = styled.span`
  align-items: center;
  display: flex;
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  padding-left; 6px;
`;

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  top: 3px;
  width: 100%;
`;

const sizes = {
  small: { font: 16, height: 32, width: 125, line: 10, borderWidth: 1 },
  medium: { font: 16, height: 32, width: 185, line: 10, borderWidth: 1 },
  large: { font: 20, height: 50, width: 250, line: 15, borderWidth: 1 },
  huge: { font: 32, height: 52, width: 275, line: 18, borderWidth: 2 }
};

const StandardButton = (props) => {
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

  useEffect(() => ReactTooltip.rebuild(), [dataTip, props.disabledTooltip]);

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
          <BarLoader
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
      {props.disabled && props.disabledTooltip && (
        <DisabledTooltip {...(props.disabledTooltip || {})} />
      )}
    </StyledButton>
  );
};

const TransactionButton = (props) => {
  const { promptingTransaction } = useContext(ChainTransactionContext);
  const tooltipId = useMemo(() => uniqueId('alt_button_tooltip_'), []);
  const extraProps = useMemo(() => {
    if (promptingTransaction) {
      return {
        disabled: true,
        loadingAnimation: true,
        disabledTooltip: {
          'data-tip': 'Waiting on Wallet...',
          'data-place': props['data-place'] || 'top',
          'data-for': tooltipId
        }
      };
    }
    return {};
  }, [promptingTransaction, tooltipId]);

  return (
    <>
      <ReactTooltip id={tooltipId} effect="solid"></ReactTooltip>
      <StandardButton {...props} {...extraProps} />
    </>
  );
};

const Button = (props) => {
  return props.isTransaction ? <TransactionButton {...props} /> : <StandardButton {...props} />
};

export default Button;
