import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaEllipsisH as MenuIcon } from 'react-icons/fa';
import ReactTooltip from 'react-tooltip';

import { hexToRGB } from '~/theme';
import ClipCorner from './ClipCorner';

const defaultSize = '92px';
const defaultBorderColor = '#333';

const MenuWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  opacity: ${p => p.open ? 1 : 0};
  transition: opacity 250ms ease;
  z-index: 3;
`;

const MenuButton = styled.div`
  align-items: center;
  background: rgba(50, 50, 50, 0.6);
  border-radius: 4px;
  color: white;
  display: flex;
  height: 25px;
  justify-content: center;
  margin: 3px;
  width: 25px;
  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.5);
  }
`;

const MenuOpenWrapper = styled.div`
  background: rgba(33, 33, 33, 0.7);
  width: 90px;
`;

export const ResourceThumbnailWrapper = styled.div`
  border: 1px solid;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
  ${p => !p.disabled && `
    ${p.onClick && `cursor: ${p.theme.cursors.active};`}
    &:hover {
      ${p.onClick && `
        background: rgba(${p.theme.colors.mainRGB}, 0.2);
      `}
      ${MenuWrapper} {
        opacity: 1;
      }
    }
  `}
  height: ${p => p.size || defaultSize};
  padding: 2px;
  position: relative;
  width: ${p => p.size || defaultSize};
  ${p => `
    background-color: ${p.backgroundColor || 'black'}};
    border-color: ${p.outlineColor || defaultBorderColor};
    color: ${p.outlineColor || defaultBorderColor};
    ${p.outlineStyle ? `border-style: ${p.outlineStyle} !important;` : ''}
    ${p.badgeColor && p.hasDenominator ? `${ResourceBadge} { &:after { color: ${p.badgeColor} !important; } }` : ''}
    ${p.badgeColor && !p.hasDenominator ? `${ResourceBadge} { &:before { color: ${p.badgeColor} !important; } }` : ''}
    ${(p.requirementMet || p.disabled) ? `
      & > * { opacity: 0.35; }
      & > svg, ${ThumbnailIconOverlay} { opacity: 1; }
    ` : ''}
  `}
`;

export const ResourceImage = styled.div`
  background: transparent url("${p => p.src}") center center;
  background-size: cover;
  background-repeat: no-repeat;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 0;
`;

export const ResourceProgress = styled.div`
  background: #333;
  border-radius: 2px;
  position: absolute;
  bottom: 5px;
  right: 5px;
  ${p => p.horizontal
    ? `
      height: 4px;
      width: calc(100% - 14px);
      right: 10px;
    `
    : `
      height: calc(100% - 14px);
      width: 3px;
      bottom: 10px;
    `
  }
  &:after {
    content: "";
    background: ${p => p.theme.colors.main};
    border-radius: 2px;
    position: absolute;
    ${p => p.horizontal
      ? `
        left: 0;
        height: 100%;
        width: ${Math.min(1, p.progress) * 100}%;
      `
      : `
        bottom: 0;
        height: ${Math.min(1, p.progress) * 100}%;
        width: 100%;
      `
    }
  }
  ${p => p.secondaryProgress && `
    &:before {
      content: "";
      background: white;
      border-radius: 2px;
      position: absolute;
      ${p.horizontal
        ? `
          left: 0;
          height: 100%;
          width: ${Math.min(1, p.secondaryProgress) * 100}%;
        `
        : `
          bottom: 0;
          height: ${Math.min(1, p.secondaryProgress) * 100}%;
          width: 100%;
        `
      }
    }
  `}
`;

const ResourceBadge = styled.div`
  position: absolute;
  bottom: 5px;
  color: white;
  font-size: 80%;
  left: 5px;
  line-height: 1em;
  &:before {
    content: "${p => p.badge !== undefined ? p.badge.toLocaleString() : ''}";
    position: relative;
    z-index: 3;
  }
  &:after {
    content: "${p => p.badgeDenominator ? `/ ${p.badgeDenominator.toLocaleString()}` : ''}";
    display: block;
  }
`;

const ResourceIconBadge = styled.div`
  position: absolute;
  font-size: 18px;
  top: 2px;
  left: 0px;
`;

const ThumbnailIconOverlay = styled.div`
  background-color: ${p => `rgba(${hexToRGB(p.color)}, 0.7)`};
  clip-path: polygon(0 0, 100% 0, 0 100%);
  color: white;
  font-size: 24px;
  height: 40px;
  left: 0;
  line-height: 0;
  padding: 1px 0 0 1px;
  position: absolute;
  top: 0;
  width: 40px;
`;

const Menu = ({ children }) => {
  const [open, setOpen] = useState();
  const onClick = useCallback((e) => {
    e.stopPropagation();
    setOpen(true);
  }, []);
  return (
    <MenuWrapper onClick={onClick} open={open || undefined}>
      {open
        ? <MenuOpenWrapper>{children(() => setOpen(false))}</MenuOpenWrapper>
        : (
          <MenuButton>
            <MenuIcon />
          </MenuButton>
        )
      }
    </MenuWrapper>
  );
};

// TODO: this component is functionally overloaded... create more components so not trying to use in so many different ways
 const ResourceThumbnail = ({
  resource,
  backgroundColor,
  badge,
  badgeColor,
  badgeDenominator,
  iconBadge,
  menu,
  outlineColor,
  outlineStyle,
  overlayIcon,
  progress,
  size,
  tooltipContainer = 'global',
  underlay,
  ...props
}) => {
  const tooltipProps = tooltipContainer ? {
    'data-place': 'top',
    'data-tip': resource.name,
    'data-for': tooltipContainer
  } : {};
  useEffect(() => ReactTooltip.rebuild(), []);
  return (
    <ResourceThumbnailWrapper
      backgroundColor={backgroundColor}
      badgeColor={badgeColor}
      size={size}
      hasDenominator={!!badgeDenominator}
      outlineColor={outlineColor}
      outlineStyle={outlineStyle}
      {...props}
      {...tooltipProps}>
      {underlay}
      <ResourceImage src={resource.iconUrls.w125} />
      <ClipCorner dimension={10} color={outlineColor || defaultBorderColor} />
      {badge !== undefined && <ResourceBadge badge={badge} badgeDenominator={badgeDenominator} />}
      {iconBadge !== undefined && <ResourceIconBadge>{iconBadge}</ResourceIconBadge>}
      {progress !== undefined && <ResourceProgress progress={progress} />}
      {overlayIcon && <ThumbnailIconOverlay color={badgeColor}>{overlayIcon}</ThumbnailIconOverlay>}
      {menu && <Menu>{menu}</Menu>}
    </ResourceThumbnailWrapper>
  );
};

export default ResourceThumbnail;