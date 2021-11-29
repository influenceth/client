import { toCrewClass } from 'influence-utils';
import styled from 'styled-components';

export default styled.span`
  color: ${p => p.theme.colors.classes[toCrewClass(p.crewClass)]};
  &:before {
    content: "●";
  }
`;