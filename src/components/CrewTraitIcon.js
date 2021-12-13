import HexagonSVG from '~/assets/icons/crew_traits/hexagon.svg';
import Svg1 from '~/assets/icons/crew_traits/1.svg';
import Svg2 from '~/assets/icons/crew_traits/2.svg';
import Svg3 from '~/assets/icons/crew_traits/3.svg';
import Svg4 from '~/assets/icons/crew_traits/4.svg';
import FallbackSvg from '~/assets/icons/RocketIcon.svg';

const innerDim = 0.54;
const innerShift = (1 - innerDim) / 2;

const CrewTraitIcon = ({ trait }) => {
  const InnerIcon = {
    1: Svg1,
    2: Svg2,
    3: Svg3,
    4: Svg4,
  }[Number(trait)] || FallbackSvg;
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