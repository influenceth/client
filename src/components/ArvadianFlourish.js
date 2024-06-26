import styled from 'styled-components';

import arvadianImage from '~/assets/images/crew_collections/2.png'

export const ArvadianFlourish = styled.div`
  display: block;
  height: 100%;
  width: 100%;
  &:before {
    content: "";
    background-image: url(${arvadianImage});
    background-position: center center;
    background-repeat: no-repeat;
    background-size: auto 80%;
    display: block;
    filter: ${p => p.filter || `contrast(0%) sepia(100%) hue-rotate(${p.hueRotation || '150deg'}) saturate(150%)`};
    height: 100%;
    opacity: ${p => p.opacity || 0.65};
  }
`;

export default ArvadianFlourish;
