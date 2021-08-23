import styled from 'styled-components';
import { FaHighlighter as HighlightIcon } from 'react-icons/fa';

import IconButton from '~/components/IconButton';

const HighlightToggle = styled(IconButton)`
  height: 25px;
  position: absolute;
  right: -5px;
  top: 5px;
  width: 25px;

  & svg {
    height: 15px !important;
    width: 15px !important;
  }
`;

const Highlighter = (props) => {
  const { active, onClick } = props;

  return (
    <HighlightToggle
      data-tip={active ? 'Disable highlighting' : 'Enable highlighting'}
      data-for="global"
      borderless
      active={active}
      onClick={onClick}>
      <HighlightIcon />
    </HighlightToggle>
  );
};

export default Highlighter;
