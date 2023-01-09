import { Crewmate } from '@influenceth/sdk';

import Svg1 from '~/assets/icons/crew_classes/1.svg';
import Svg2 from '~/assets/icons/crew_classes/2.svg';
import Svg3 from '~/assets/icons/crew_classes/3.svg';
import Svg4 from '~/assets/icons/crew_classes/4.svg';
import Svg5 from '~/assets/icons/crew_classes/5.svg';
import theme from '~/theme';

const indexedIcons = [
  null, // 1-indexed
  Svg1, Svg2, Svg3, Svg4, Svg5
];

const CrewClassIcon = ({ crewClass, overrideColor }) => {
  const classLabel = Crewmate.getClass(crewClass)?.name || '';
  const ClassIcon = indexedIcons[Number(crewClass)];
  if (ClassIcon) {
    return (
      <ClassIcon
        className="icon"
        style={{ color: overrideColor || theme.colors.classes[classLabel] }} />
    );
  }
  return null;
};

export default CrewClassIcon;