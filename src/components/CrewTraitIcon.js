import styled from 'styled-components';

import HexagonOutlineSVG from '~/assets/icons/crew_traits/hexagon_outline.svg';
import HexagonInnerHighlightSVG from '~/assets/icons/crew_traits/hexagon_inner_highlight.svg';
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
import Svg24 from '~/assets/icons/crew_traits/24.svg';
import Svg25 from '~/assets/icons/crew_traits/25.svg';
import Svg26 from '~/assets/icons/crew_traits/26.svg';
import Svg27 from '~/assets/icons/crew_traits/27.svg';
import Svg28 from '~/assets/icons/crew_traits/28.svg';
import Svg29 from '~/assets/icons/crew_traits/29.svg';
import Svg30 from '~/assets/icons/crew_traits/30.svg';
import Svg31 from '~/assets/icons/crew_traits/31.svg';
import Svg32 from '~/assets/icons/crew_traits/32.svg';
import Svg33 from '~/assets/icons/crew_traits/33.svg';
import Svg34 from '~/assets/icons/crew_traits/34.svg';
import Svg35 from '~/assets/icons/crew_traits/35.svg';
import Svg36 from '~/assets/icons/crew_traits/36.svg';
import Svg37 from '~/assets/icons/crew_traits/37.svg';
import Svg38 from '~/assets/icons/crew_traits/38.svg';
import Svg39 from '~/assets/icons/crew_traits/39.svg';
import Svg40 from '~/assets/icons/crew_traits/40.svg';
import Svg41 from '~/assets/icons/crew_traits/41.svg';
import Svg42 from '~/assets/icons/crew_traits/42.svg';
import Svg43 from '~/assets/icons/crew_traits/43.svg';
import Svg44 from '~/assets/icons/crew_traits/44.svg';
import Svg45 from '~/assets/icons/crew_traits/45.svg';
import Svg46 from '~/assets/icons/crew_traits/46.svg';
import Svg47 from '~/assets/icons/crew_traits/47.svg';
import Svg48 from '~/assets/icons/crew_traits/48.svg';
import Svg49 from '~/assets/icons/crew_traits/49.svg';
import Svg50 from '~/assets/icons/crew_traits/50.svg';
import FallbackSvg from '~/assets/icons/RocketIcon.svg';

const innerDim = 0.54;
const innerShift = (1 - innerDim) / 2;
const indexedIcons = [ // 1-indexed
  null, Svg1, Svg2, Svg3, Svg4, Svg5, Svg6, Svg7, Svg8, Svg9,
  Svg10, Svg11, Svg12, Svg13, Svg14, Svg15, Svg16, Svg17, Svg18, Svg19,
  Svg20, Svg21, Svg22, Svg23, Svg24, Svg25, Svg26, Svg27, Svg28, Svg29,
  Svg30, Svg31, Svg32, Svg33, Svg34, Svg35, Svg36, Svg37, Svg38, Svg39,
  Svg40, Svg41, Svg42, Svg43, Svg44, Svg45, Svg46, Svg47, Svg48, Svg49,
  Svg50
];

const HexagonInnerHighlight = styled(HexagonInnerHighlightSVG)`
  color: rgba(${p => p.theme.colors.mainRGB}, 0.15);
`;

const CrewTraitIcon = ({ hideHexagon, trait, type }) => {
  const InnerIcon = indexedIcons[Number(trait)] || FallbackSvg;
  const highlight = type && type === 'impactful';
  return (
    <svg className="icon">
      {!hideHexagon && (
        <>
          <HexagonOutlineSVG />
          {highlight && <HexagonInnerHighlight />}
        </>
      )}
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