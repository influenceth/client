import styled, { css, keyframes } from 'styled-components';

import AttentionDot from '~/components/AttentionDot';

export const cardTransitionSpeed = '300ms';
export const cardTransitionFunction = 'ease';

const AttentionIcon = styled(AttentionDot)`
  position: absolute !important;
  left: 8px;
  top: 50%;
  margin-top: -5px;
`;

const OverlayButton = styled.div`
  background-color: transparent;
  font-weight: bold;
  margin-bottom: 12px;
  padding: 4px;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0px 0px 3px black;
  width: calc(100% - 16px);
`;

const OverlayCaption = styled.div`
  padding: 12px;
  font-size: 12px;
  text-align: center;
`;

const OverlayFlourish = styled.div`
  width: 40px;
  height: 0;
  border-bottom: 4px solid transparent;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
`;

const OverlayIcon = styled.div`
  position: absolute;
  font-size: ${p => p.iconSize ? p.iconSize : '60'}px;
  top: calc(50% - ${p => p.iconSize ? p.iconSize / 2 : '30'}px);
`;

const CardOverlayHoverCss = (p) => `
  border: 1px solid rgba(${p.rgbHover || p.rgb});
  outline: 3px solid rgba(${p.rgbHover || p.rgb}, 0.5);
  ${OverlayButton},
  ${OverlayCaption},
  ${OverlayFlourish},
  ${OverlayIcon} {
    opacity: 1;
  }

  ${p.rgbHover && `
    color: rgb(${p.rgbHover});
    ${OverlayButton} {
      background-color: rgba(${p.rgbHover}, 0.3);
      color: rgb(${p.rgbHover});
    }
    ${OverlayFlourish} {
      border-bottom-color: rgb(${p.rgbHover});
    }
  `}
`;

// const CardOverlayHoverCss = css`
//   border: 1px solid rgba(${(p) => p.rgbHover || p.rgb});
//   outline: 3px solid rgba(${(p) => p.rgbHover || p.rgb}, 0.5);
//   ${OverlayButton},
//   ${OverlayCaption},
//   ${OverlayFlourish},
//   ${OverlayIcon} {
//     opacity: 1;
//   }

//   ${p => p.rgbHover && `
//     color: rgb(${p.rgbHover});
//     ${OverlayButton} {
//       background-color: rgba(${p.rgbHover}, 0.3);
//       color: rgb(${p.rgbHover});
//     }
//     ${OverlayFlourish} {
//       border-bottom-color: rgb(${p.rgbHover});
//     }
//   `}
// `;

const buttonKeyframes = (rgb) => keyframes`
  0% {
    background-color: rgba(${rgb}, 0.3);
    color: rgba(${rgb}, 1.0);
  }
  50% {
    background-color: rgba(${rgb}, 0.2);
    color: rgba(${rgb}, 0.7);
  }
  100% {
    background-color: rgba(${rgb}, 0.3);
    color: rgba(${rgb}, 1.0);
  }
`;

// this ensures that keyframes are always inserted even though only conditionally used below
css`
  animation: ${buttonKeyframes('255, 255, 255')} 1000ms linear infinite;
`;

const CardOverlay = styled.div`
  align-items: center;
  border: 1px solid ${(p) => p.alwaysOn.includes('border') ? `rgb(${(p) => p.rgb})` : 'transparent'};
  bottom: 0;
  color: rgb(${(p) => p.rgb || '255,255,255'});
  display: flex;
  flex-direction: column;
  left: 0;
  height: 100%;
  justify-content: flex-end;
  outline: 3px solid ${(p) => p.alwaysOn.includes('border') ? `rgba(${(p) => p.rgb}, 0.5)` : 'transparent'};
  position: absolute;
  right: 0;
  top: 0;
  transition: border ${cardTransitionSpeed} ${cardTransitionFunction},
    outline ${cardTransitionSpeed} ${cardTransitionFunction};
  width: 100%;

  ${OverlayButton} {
    ${p => p.buttonAttention ? `animation: ${p => buttonKeyframes(p.rgb)} 1000ms linear infinite;` : ''}
    background-color: rgba(${(p) => p.rgb}, 0.25);
    color: rgb(${(p) => p.rgb});
    opacity: ${(p) => p.alwaysOn.includes('button') ? 1 : 0};
    &:after {
      content: "${p => p.button}";
    }
  }
  ${OverlayCaption} {
    opacity: ${(p) => p.alwaysOn.includes('caption') ? 1 : 0};
  }
  ${OverlayFlourish} {
    border-bottom-color: rgb(${(p) => p.rgb});
    opacity: ${(p) => p.alwaysOn.includes('border') ? 1 : 0};
  }
  ${OverlayIcon} {
    ${(p) => {
      if (p.alwaysOn.includes('icon')) {
        return `
          opacity: 1;
        `;
      }
      return `
        color: ${p.rgbHover ? `rgb(${p.rgbHover})` : 'inherit'};
        opacity: 0;
      `;
    }}
  }

  ${OverlayButton},
  ${OverlayCaption},
  ${OverlayIcon} {
    transition: opacity ${cardTransitionSpeed} ${cardTransitionFunction}, color ${cardTransitionSpeed} ${cardTransitionFunction}, background-color ${cardTransitionSpeed} ${cardTransitionFunction};
  }

  ${p => !p.disableHover && `
    &:hover {
      ${CardOverlayHoverCss(p)}
      
      ${OverlayButton} {
        animation: none;
        &:after {
          content: "${p.buttonHover || p.button}";
        }
        ${AttentionIcon} {
          display: none;
        }
      }
    }
  `}

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    ${(p) => p.rgb && CardOverlayHoverCss(p)}
  }
`;

const CrewmateCardOverlay = (config) => (
  <CardOverlay {...config} alwaysOn={config.alwaysOn || []}>
    {config.icon && <OverlayIcon iconSize={config.iconSize}>{config.icon}</OverlayIcon>}
    <div style={{ flex: 1 }} />
    {config.caption && <OverlayCaption>{config.caption}</OverlayCaption>}
    {config.button && (
      <OverlayButton style={config.buttonStyle || {}}>
        {config.buttonAttention && <AttentionIcon size={10} />}
      </OverlayButton>
    )}
    <OverlayFlourish />
  </CardOverlay>
);

export default CrewmateCardOverlay;