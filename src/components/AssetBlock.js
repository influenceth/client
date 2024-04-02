import styled from 'styled-components';

export const assetBlockCornerSize = 15;

const AssetBlock = styled.div`
  ${p => p.theme.clipCorner(assetBlockCornerSize)};
  padding: 8px 16px 8px 8px;
  position: relative;
  transition-properties: background, border-color;
  transition-duration: 250ms;
  transition-function: ease;
  & > svg {
    transition: stroke 250ms ease;
  }

  ${p => p.isSelected ? `
      background: rgba(${p.theme.colors.darkMainRGB}, 0.3);
      border: 1px solid rgba(${p.theme.colors.mainRGB}, 0.7);
      & > svg {
        stroke: rgba(${p.theme.colors.mainRGB}, 0.7);
      }
    `
    : `
      background: ${p.subtle ? '#1c1c1c' : `rgba(${p.theme.colors.darkMainRGB}, 0.1)`};
      border: 1px solid transparent;
      & > svg {
        stroke: transparent;
      }
    `
  }

  ${p => p.onClick && !p.disabled && `
    cursor: ${p.theme.cursors.active};
    &:hover {
      background: rgba(${p.theme.colors.darkMainRGB}, 0.5) !important;
      border-color: rgba(${p.theme.colors.mainRGB}, 0.9) !important;
      & > svg {
        stroke: rgba(${p.theme.colors.mainRGB}, 0.9) !important;
      }
    }
  `};

  ${p => p.style?.borderColor && `
    & > svg {
      stroke: ${p.style?.borderColor};
    }
  `}
`;

export default AssetBlock;