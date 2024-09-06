import styled from 'styled-components';

const ThumbnailIconBadge = styled.div`
  font-size: 18px;
  left: 0px;
  position: absolute;
  top: 0px;

  ${p => p.iconBadgeCorner && `
      & > svg {
        color: white !important;
        filter: drop-shadow(0px 0px 1px black);
        position: relative;
        top: -2px;
        z-index: 1;
      }
      &:before {
        border: 15px solid ${p.iconBadgeCorner};
        border-bottom-color: transparent;
        border-right-color: transparent;
        content: "";
        height: 0px;
        position: absolute;
        width: 0px;
        z-index: 0;
      }
    `
  };
`;

export default ThumbnailIconBadge;