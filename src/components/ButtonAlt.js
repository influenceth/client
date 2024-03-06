import { useContext, useEffect, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import BarLoader from 'react-spinners/BarLoader';
import { uniqueId } from 'lodash';

import useStore from '~/hooks/useStore';
import Badge from '~/components/Badge';
import theme, { getContrastText, hexToRGB } from '~/theme';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';

export const bgOpacity = 0.2;
export const hoverBgOpacity = 0.2;

const sizes = {
  icon: { font: 16, height: 26, width: 34, line: 8, borderWidth: 1, isIconOnly: true },
  bigicon: { font: 16, height: 32, width: 40, line: 10, borderWidth: 1, isIconOnly: true },
  hugeicon: { font: 24, height: 40, width: 48, line: 10, borderWidth: 1, isIconOnly: true },
  wideicon: { font: 25, height: 32, width: 85, line: 10, borderWidth: 1, isIconOnly: true },
  legacy: { font: 14, height: 18, width: 100, line: 10, borderWidth: 1, textTransform: 'none', background: 'transparent' },
  small: { font: 14, height: 26, width: 100, line: 10, borderWidth: 1 },
  medium: { font: 16, height: 32, width: 185, line: 10, borderWidth: 1 },
  large: { font: 20, height: 50, width: 250, line: 15, borderWidth: 1 },
  huge: { font: 32, height: 52, width: 275, line: 18, borderWidth: 2 }
};

const InnerContainer = styled.div`
  align-items: center;
  clip-path: polygon(
    0 0,
    100% 0,
    ${p => p.flip ? `
      100% 100%,
      ${p.sizeParams.line - 3.5}px 100%,
      0 calc(100% - ${p.sizeParams.line - 3.5}px)
    `
    : `
      100% calc(100% - ${p.sizeParams.line - 3.5}px),
      calc(100% - ${p.sizeParams.line - 3.5}px) 100%,
      0 100%
    `}
  );
  display: flex;
  justify-content: center;
  transition: background-color 100ms ease;
  width: 100%;

  & > * {
    margin-right: 5px;
    &:last-child {
      margin-right: 0;
    }
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
  border: ${p => p.sizeParams.borderWidth}px solid ${p => p.borderless ? 'transparent' : (p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main))};
  clip-path: polygon(
    0 0,
    100% 0,
    ${p => p.flip ? `
      100% 100%,
      ${p.sizeParams.line - 0.5}px 100%,
      0 calc(100% - ${p.sizeParams.line - 0.5}px)
    `
    : `
      100% calc(100% - ${p.sizeParams.line - 0.5}px),
      calc(100% - ${p.sizeParams.line - 0.5}px) 100%,
      0 100%
    `}
  );
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: ${p => p.sizeParams.font}px;
  min-width: ${p => p.width || p.sizeParams.width}px;
  padding: 3px; /* must match loadingCss.top */
  pointer-events: auto;
  position: relative;
  text-transform: ${p => p.textTransform || p.sizeParams.textTransform || 'uppercase'};
  transition: all 100ms ease;

  & > svg {
    max-height: 24px;
    max-width: 24px;
  }

  & ${InnerContainer} {
    min-height: ${p => p.sizeParams.height}px;
    ${p => p.sizeParams.isIconOnly ? '' : `padding: ${p.padding || '0 10px'};`}
  }

  ${p => p.disabled
    ? `
      color: rgba(255, 255, 255, 0.5);
      cursor: ${p.theme.cursors.default};
      border-color: ${p.borderless ? 'transparent' : p.theme.colors.disabledText};
      & > div {
        background-color: ${p.disabledColor || (p.background === 'transparent' ? 'transparent' : `rgba(${hexToRGB(p.theme.colors.disabledButton)}, ${bgOpacity * (p.bgStrength || 1)})`)};
      }
      & > svg {
        stroke: ${p.theme.colors.disabledText};
      }
    `
    : `
      color: ${p.color || (
        p.highContrast
          ? (
            p.background && p.background !== 'transparent'
              ? getContrastText(p.background)
              : 'white'
          )
          : (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)
      )};
      & > div {
        background-color: ${p.background || `rgba(${hexToRGB(p.isTransaction ? p.theme.colors.txButton : p.theme.colors.mainButton)}, ${bgOpacity * (p.bgStrength || 1)})`};
        transition: all 100ms ease;
      }
      &:active > div {
        background-color: ${p.isTransaction ? p.theme.colors.txButton : p.theme.colors.mainButton};
      }
      &:hover > div {
        color: white;
        background-color: rgba(${hexToRGB(p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)}, ${hoverBgOpacity * (p.bgStrength || 1)});
      }
    `
  }
`;

const Corner = styled.svg`
  bottom: -1px;
  height: ${p => p.sizeParams.line - (p.sizeParams.borderWidth === 1 ? 0 : p.sizeParams.borderWidth - 1)}px;
  margin-right: 0;
  position: absolute;
  stroke: ${p => p.borderless ? 'transparent' : (p.color || (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main))};
  stroke-width: ${p => p.sizeParams.borderWidth + 0.5}px;
  width: ${p => p.sizeParams.line - (p.sizeParams.borderWidth === 1 ? 0 : p.sizeParams.borderWidth - 1)}px;

  ${p => p.flip
    ? `
      left: -1px;
      transform: scaleX(-1);
    `
    : `
      right: -1px;
    `
  }
`;

const StyledBadge = styled(Badge)`
  position: absolute;
  font-size: 80%;
  margin-left: calc(${p => p.width || p.sizeParams.width}px - 0.8em);
  margin-top: -0.5em;
  z-index: 1;
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

const StandardButton = (props) => {
  const {
    'data-place': dataPlace,
    'data-tip': dataTip,
    loading,
    onClick,
    setRef,
    children,
    ...restProps } = props;

  const playSound = useStore(s => s.dispatchSoundRequested);
  const sizeParams = sizes[props.size] || sizes.medium;
  const { style, ...nonStyleProps } = restProps;

  const _onClick = (e) => {
    playSound('effects.click');
    if (onClick) onClick(e);
  }

  useEffect(() => ReactTooltip.rebuild(), [dataTip, props.disabledTooltip]);

  if (setRef) restProps.ref = setRef;

  return (
    <>
      {props.badge ? <StyledBadge value={props.badge} {...nonStyleProps} sizeParams={sizeParams} /> : null}
      <StyledButton
        onClick={_onClick}
        data-tip={dataTip}
        data-place={dataPlace || "right"}
        sizeParams={sizeParams}
        background={sizeParams.background}
        {...restProps}>
        <InnerContainer flip={restProps.flip} sizeParams={sizeParams}>
          {loading && (
            <BarLoader
              color={props.color
                ? getContrastText(props.color)
                : (props.isTransaction ? theme.colors.txButton : theme.colors.main)}
              css={loadingCss}
              height={1} />
          )}
          {children}
        </InnerContainer>
        <Corner
          borderless={props.borderless}
          color={props.color}
          flip={restProps.flip}
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
    </>
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
