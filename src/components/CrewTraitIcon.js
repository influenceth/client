import HexagonSVG from '~/assets/icons/crew_traits/hexagon.svg';
import Svg1 from '~/assets/icons/crew_traits/1.svg';
import Svg2 from '~/assets/icons/crew_traits/2.svg';
import Svg3 from '~/assets/icons/crew_traits/3.svg';
import Svg4 from '~/assets/icons/crew_traits/4.svg';
import Svg5 from '~/assets/icons/crew_traits/5.svg';
import Svg6 from '~/assets/icons/crew_traits/6.svg';
import Svg7 from '~/assets/icons/crew_traits/7.svg';
import Svg8 from '~/assets/icons/crew_traits/8.svg';
import Svg9 from '~/assets/icons/crew_traits/9.svg';
import Svg10 from '~/assets/icons/crew_traits/10.svg';
import Svg11 from '~/assets/icons/crew_traits/11.svg';
import Svg12 from '~/assets/icons/crew_traits/12.svg';
import Svg13 from '~/assets/icons/crew_traits/13.svg';
import Svg14 from '~/assets/icons/crew_traits/14.svg';
import Svg15 from '~/assets/icons/crew_traits/15.svg';
import Svg16 from '~/assets/icons/crew_traits/16.svg';
import Svg17 from '~/assets/icons/crew_traits/17.svg';
import Svg18 from '~/assets/icons/crew_traits/18.svg';
import Svg19 from '~/assets/icons/crew_traits/19.svg';
import Svg20 from '~/assets/icons/crew_traits/20.svg';
import Svg21 from '~/assets/icons/crew_traits/21.svg';
import Svg22 from '~/assets/icons/crew_traits/22.svg';
import Svg23 from '~/assets/icons/crew_traits/23.svg';
import FallbackSvg from '~/assets/icons/RocketIcon.svg';

const innerDim = 0.54;
const innerShift = (1 - innerDim) / 2;
const indexedIcons = [
  null, // 1-indexed
  Svg1, Svg2, Svg3, Svg4, Svg5, Svg6, Svg7, Svg8, Svg9, Svg10,
  Svg11, Svg12, Svg13, Svg14, Svg15, Svg16, Svg17, Svg18, Svg19, Svg20,
  Svg21, Svg22, Svg23,
];

const CrewTraitIcon = ({ trait }) => {
  const InnerIcon = indexedIcons[Number(trait)] || FallbackSvg;
  return (
    <svg className="icon">
      <HexagonSVG />
      <InnerIcon
        className="icon"
        height={`${innerDim}em`}
        width={`${innerDim}em`}
        x={`${innerShift}em`}
        y={`${innerShift}em`} />
    </svg>
  );
};

export default CrewTraitIcon;