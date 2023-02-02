import styled from 'styled-components';

import { keyify } from '~/lib/utils';

const ResourceColorIcon = styled.div`
  background-color: ${p => p.theme.colors.resources[keyify(p.category)]};
  border-radius: 2px;
  display: inline-block;
  height: 10px;
  margin-right: 4px;
  width: 10px;
`;

export default ResourceColorIcon;