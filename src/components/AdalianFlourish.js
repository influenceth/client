import styled from 'styled-components';

import adalianImage from '~/assets/images/crew_collections/4.png'

export const AdalianFlourish = styled.div`
  display: block;
  height: 100%;
  width: 100%;
  &:before {
    content: "";
    background-image: url(${adalianImage});
    background-position: center center;
    background-repeat: no-repeat;
    background-size: auto 80%;
    display: block;
    filter: ${p => p.filter || `contrast(0%) sepia(100%) hue-rotate(150deg) saturate(150%)`};
    height: 100%;
    opacity: 0.65;
  }
`;

export default AdalianFlourish;
