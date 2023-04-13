import React from 'react';
import { CheckIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';

import theme, { hexToRGB } from '~/theme';

const ResourceRequirement = ({ hasTally, isGathering, needsTally, ...props }) => {
  if (isGathering) {
    props.badge = hasTally;
    if (hasTally >= needsTally) {
      props.badgeColor = theme.colors.main;
      props.overlayIcon = <CheckIcon />;
    } else {
      props.badgeDenominator = needsTally;
      props.badgeColor = theme.colors.lightOrange;
      props.outlineColor = theme.colors.lightOrange;
      props.outlineStyle = 'dashed';
    }
  } else {
    const lightOrangeRGB = hexToRGB(theme.colors.lightOrange);
    props.backgroundColor = `rgba(${lightOrangeRGB}, 0.1)`;
    props.outlineColor = `rgba(${lightOrangeRGB}, 0.25)`;
    props.badge = needsTally;
    props.badgeColor = theme.colors.lightOrange;
    props.badgeDenominator = null;
  }
  return (
    <ResourceThumbnail {...props} />
  );
};

export default ResourceRequirement;