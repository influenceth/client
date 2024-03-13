import { useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import BarLoader from 'react-spinners/BarLoader';

import Badge from '~/components/Badge';
import theme, { getContrastText } from '~/theme';
import {
  StyledButton,
  InnerContainer,
  Corner,
  sizes
} from '~/components/ButtonAlt';

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

const Button = (props) => {
  const {
    'data-place': dataPlace,
    'data-tip': dataTip,
    loading,
    setRef,
    children,
    ...restProps } = props;

  const sizeParams = sizes[props.size] || sizes.medium;
  const { style, ...nonStyleProps } = restProps;

  useEffect(() => ReactTooltip.rebuild(), [dataTip, props.disabledTooltip]);

  if (setRef) restProps.ref = setRef;

  return (
    <>
      {props.badge ? <StyledBadge value={props.badge} {...nonStyleProps} sizeParams={sizeParams} /> : null}
      <StyledButton
        data-tip={dataTip}
        data-place={dataPlace || "right"}
        sizeParams={sizeParams}
        background={sizeParams.background}
        theme={theme}
        {...restProps}>
        <InnerContainer flip={restProps.flip} sizeParams={sizeParams} theme={theme}>
          {loading && (
            <BarLoader
              color={props.color
                ? getContrastText(props.color)
                : theme.colors.mainButton}
              css={loadingCss}
              height={1}
              theme={theme} />
          )}
          {children}
        </InnerContainer>
        <Corner
          borderless={props.borderless}
          color={props.color}
          flip={restProps.flip}
          sizeParams={sizeParams}
          theme={theme}
          viewBox={`0 0 ${sizeParams.line} ${sizeParams.line}`}
          xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1={sizeParams.line} x2={sizeParams.line} y2="0" />
        </Corner>
        {props.disabled && props.disabledTooltip && (
          <DisabledTooltip {...(props.disabledTooltip || {})} theme={theme} />
        )}
      </StyledButton>
    </>
  );
};

export default Button;
