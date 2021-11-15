import React from 'react';
import styled from 'styled-components';

const TitleWithUnderline = styled.span`
  position: relative;
  &:after {
    content: '';
    height: 3px;
    background: ${p => p.theme.colors.main};
    position: absolute;
    bottom: 0;
    left: 16px;
    right: 16px;
  }
`;

export default TitleWithUnderline;
