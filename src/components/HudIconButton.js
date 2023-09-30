import styled from 'styled-components';

import IconButton from './IconButton';

const HudIconButton = styled(IconButton).attrs((p) => ({
  backgroundColor: p.isActive ? p.theme.colors.main : undefined,
  borderless: true
}))`
  color: #CCC;
  font-size: 18px;
  height: 40px;
  line-height: 0;
  margin: 0;
  width: 40px;
`;

export default HudIconButton;