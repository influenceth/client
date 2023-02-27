import React from 'react';
import { CheckIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';

import theme from '~/theme';

const ResourceRequirement = ({ hasTally, isGathering, needsTally, ...props }) => {
  if (isGathering) {
    props.badge = hasTally;
    if (hasTally >= needsTally) {
      props.badgeColor = theme.colors.main;
      props.overlayIcon = <CheckIcon />;
    } else {
      props.badgeDenominator = needsTally;
      props.badgeColor = theme.colors.yellow;
      props.outlineColor = theme.colors.yellow;
      props.outlineStyle = 'dashed';
    }
  } else {
    props.badge = needsTally;
    props.badgeDenominator = null;
  }
  return (
    <ResourceThumbnail {...props} />
  );
};

export default ResourceRequirement;