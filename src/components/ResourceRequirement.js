import React from '~/lib/react-debug';
import styled, { keyframes } from 'styled-components';

import { CheckSmallIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount, formatResourceAmountRatio } from '~/game/interface/hud/actionDialogs/components';

import theme, { hexToRGB } from '~/theme';

const incompleteRGB = hexToRGB(theme.colors.lightOrange);
const completeRGB = hexToRGB(theme.colors.darkGreen);

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
    const { numerator, denominator, deficit } = formatResourceAmountRatio(item.numerator, item.denominator, props.resource.i);
    props.badge = numerator;
    props.badgeDenominator = denominator;
    props.tooltipOverride = (deficit) ? `${props.resource?.name} (${deficit} needed)` : props.resource?.name;
  // (else, show denominator if set (showing requirements) or numerator if not (showing something else))
  } else {
    props.badge = formatResourceAmount(item.denominator || item.numerator, props.resource.i);
  }

  // styles
  if (!noStyles) {
    // (needs not yet met)
    if (item.denominator && item.numerator < item.denominator) {
      if (props.isOutgoing) { // less scary looking
        props.backgroundColor = `rgba(${item.numerator > 0 ? theme.colors.mainRGB : '50, 50, 50'}, 0.25)`;
        props.badgeColor = item.numerator > 0 ? '#fff' : '#ccc';
        props.outlineColor = `rgba(${item.numerator > 0 ? theme.colors.mainRGB : '50, 50, 50'}, 0.75)`;
        if (item.numerator > 0) { // (needs partially met)
          props.underlay = <PartialUnderlay />;
          props.upperRightBadge = `+${(item.denominator - item.numerator).toLocaleString()}${props.resource.isAtomic ? '' : ' kg'}`;
          props.upperRightBadgeColor = theme.colors.main;
        }
      } else {
        props.backgroundColor = `rgba(${incompleteRGB}, 0.25)`;
        props.badgeColor = theme.colors.lightOrange;
        props.outlineColor = `rgba(${incompleteRGB}, 0.75)`;
        if (item.numerator > 0) { // (needs partially met)
          props.underlay = <PartialUnderlay />;
          props.upperRightBadge = `-${(item.denominator - item.numerator).toLocaleString()}${props.resource.isAtomic ? '' : ' kg'}`;
        }
      }

    // (needs met)
    } else if (item.denominator && item.numerator === item.denominator) {
      props.backgroundColor = `rgba(${completeRGB}, 0.25)`;
      props.badgeColor = theme.colors.darkGreen;
      props.outlineColor = `rgba(${completeRGB}, 0.5)`;
      if (item.denominator) { // (needs met)
        props.overlayIcon = <div style={{ fontSize: 16, padding: '3px 0 0 3px' }}><CheckSmallIcon /></div>;
      }

    // (no needs specified)
    } else {
      props.backgroundColor = `rgba(${theme.colors.mainRGB}, 0.25)`;
      props.outlineColor = `rgba(${theme.colors.mainRGB}, 0.75)`;
      if (item.denominator) { // (needs met)
        props.overlayIcon = <div style={{ fontSize: 16, padding: '3px 0 0 3px' }}><CheckSmallIcon /></div>;
      }
    }

    if (item.customIcon) {
      props.backgroundColor = `rgba(${theme.colors.mainRGB}, 0.15)`;
      props.badgeColor = theme.colors.main;
      props.outlineColor = `rgba(${theme.colors.mainRGB}, 0.5)`;
      props.overlayIcon = item.customIcon.animated
        ? <Animation>{item.customIcon.icon}</Animation>
        : <div>{item.customIcon.icon}</div>;
    }

    if (item.requirementMet) {
      props.requirementMet = true;
      props.backgroundColor = props.outlineColor = 'rgba(50, 50, 50, 0.3)';
    }

    if (item.stripeAnimation) {
      props.overlayStripes = true;
    }
  }

  return (
    <ResourceThumbnail {...props} />
  );
};

export default ResourceRequirement;