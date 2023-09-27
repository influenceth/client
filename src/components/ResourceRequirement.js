import React from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckIcon, SurfaceTransferIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';

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

const ResourceRequirement = ({ isGathering, item, noStyles, ...props }) => {

  // badge amounts
  // (if gathering, show numerator and denominator)
  if (isGathering) {
    props.badge = formatResourceAmount(item.numerator, props.resource.i);
    props.badgeDenominator = formatResourceAmount(item.denominator, props.resource.i);
  // (else, show denominator if set (showing requirements) or numerator if not (showing something else))
  } else {
    props.badge = formatResourceAmount(item.denominator || item.numerator, props.resource.i);
  }

  // styles
  if (!noStyles) {
    // (needs not yet met)
    if (item.denominator && item.numerator < item.denominator) {
      props.backgroundColor = `rgba(${lightOrangeRGB}, 0.15)`;
      props.badgeColor = theme.colors.lightOrange;
      props.outlineColor = `rgba(${lightOrangeRGB}, 0.4)`;
      if (item.numerator > 0) { // (needs partially met)
        props.underlay = <PartialUnderlay />;
      }
    
    // (needs met or no needs specified)
    } else {
      props.backgroundColor = `rgba(${theme.colors.mainRGB}, 0.1)`;
      props.badgeColor = theme.colors.main;
      props.outlineColor = `rgba(${theme.colors.mainRGB}, 0.4)`;
      if (item.denominator) { // (needs met)
        props.overlayIcon = <div style={{ fontSize: 16, padding: '3px 0 0 3px' }}><CheckIcon /></div>;
      }
    }

    if (item.customIcon) { // TODO: use for inTransit
      props.overlayIcon = item.customIcon.animated
        ? <Animation>{item.customIcon.icon}</Animation>
        : <div>{item.customIcon.icon}</div>;
    }

    if (item.requirementMet) {
      props.requirementMet = true;
      props.backgroundColor = props.outlineColor = 'rgba(50, 50, 50, 0.3)';
    }
  }
  
  return (
    <ResourceThumbnail {...props} />
  );
};

export default ResourceRequirement;