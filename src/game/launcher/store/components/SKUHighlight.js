import styled from 'styled-components';
import { hexToRGB } from '~/theme';

const SKUHighlight = styled.div`
  align-items: center;
  background: rgba(${p => p.color ? hexToRGB(p.color) : p.theme.colors.mainRGB}, 0.3);
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 24px;
  justify-content: center;
  margin-bottom: 7px;
  padding: 7px 0;
  &:last-child { margin-bottom: 0; }
`;

export default SKUHighlight;