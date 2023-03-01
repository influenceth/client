import React from 'react';
import styled from 'styled-components';
import ClipCorner from './ClipCorner';

const defaultSize = '115px';
const defaultBorderColor = '#333';

export const ResourceThumbnailWrapper = styled.div`
  border: 1px solid;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
  height: ${p => p.size || defaultSize};
  padding: 2px;
  position: relative;
  width: ${p => p.size || defaultSize};
  ${p => `
    border-color: ${p.outlineColor || defaultBorderColor};
    ${p.outlineStyle ? `border-style: ${p.outlineStyle} !important;` : ''}
    ${p.badgeColor && p.hasDenominator ? `${ResourceBadge} { &:after { color: ${p.badgeColor} !important; } }` : ''}
    ${p.badgeColor && !p.hasDenominator ? `${ResourceBadge} { &:before { color: ${p.badgeColor} !important; } }` : ''}
  `}
`;

export const ResourceImage = styled.div`
  background: black url("${p => p.src}") center center;
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
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: ${p => p.theme.colors.main};
  font-size: 40px;
  display: flex;
  justify-content: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;

// TODO: this component is functionally overloaded... create more components so not trying to use in so many different ways
 const ResourceThumbnail = ({ resource, badge, badgeColor, badgeDenominator, iconBadge, outlineColor, outlineStyle, overlayIcon, progress, size, showTooltip, ...props }) => {
  const tooltipProps = showTooltip ? {
    'data-tip': resource.name,
    'data-for': 'global'
  } : {}
  return (
    <ResourceThumbnailWrapper
      badgeColor={badgeColor}
      size={size}
      hasDenominator={!!badgeDenominator}
      outlineColor={outlineColor}
      outlineStyle={outlineStyle}
      {...props}
      {...tooltipProps}>
      <ResourceImage src={resource.iconUrls.w125} />
      <ClipCorner dimension={10} color={outlineColor || defaultBorderColor} />
      {badge !== undefined && <ResourceBadge badge={badge} badgeDenominator={badgeDenominator} />}
      {iconBadge !== undefined && <ResourceIconBadge>{iconBadge}</ResourceIconBadge>}
      {progress !== undefined && <ResourceProgress progress={progress} />}
      {overlayIcon && <ThumbnailIconOverlay>{overlayIcon}</ThumbnailIconOverlay>}
    </ResourceThumbnailWrapper>
  );
};

export default ResourceThumbnail;