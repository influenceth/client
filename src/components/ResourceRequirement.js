import React from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckIcon, SurfaceTransferIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';

import theme, { hexToRGB } from '~/theme';

const lightOrangeRGB = hexToRGB(theme.colors.lightOrange);

const opacityAnimation = keyframes`
  0% { opacity: 0.9; }
  50% { opacity: 0.3; }
  100% { opacity: 0.9; }
`;
const Animation = styled.div`
  animation: ${opacityAnimation} 1250ms ease infinite;
`;
const PartialUnderlay = styled.div`
  background: ${p => p.theme.colors.main};
  clip-path: polygon(0 0, 100% 0, 0 100%);
  height: 100%;
  left: 0;
  opacity: 0.5;
  position: absolute;
  top: 0;
  width: 100%;
`;

const ResourceRequirement = ({ isGathering, totalRequired, inInventory, inTransit, inNeed, ...props }) => {
  // badge amounts
  props.badge = totalRequired;
  if (isGathering) {
    props.badge = inInventory + inTransit;
    props.badgeDenominator = totalRequired;
  }

  // styles
  if (inNeed > 0) {
    props.backgroundColor = `rgba(${lightOrangeRGB}, 0.15)`;
    props.badgeColor = theme.colors.lightOrange;
    props.outlineColor = `rgba(${lightOrangeRGB}, 0.4)`;
    if (inNeed < totalRequired) {
      props.underlay = <PartialUnderlay />;
    }
  } else {
    props.backgroundColor = `rgba(${theme.colors.mainRGB}, 0.1)`;
    props.badgeColor = theme.colors.main;
    props.outlineColor = `rgba(${theme.colors.mainRGB}, 0.4)`;
    props.overlayIcon = <div style={{ fontSize: 16, padding: '3px 0 0 3px' }}><CheckIcon /></div>;
  }
  if (inTransit > 0) props.overlayIcon = <Animation><SurfaceTransferIcon /></Animation>;
  
  return (
    <ResourceThumbnail {...props} />
  );
};

export default ResourceRequirement;