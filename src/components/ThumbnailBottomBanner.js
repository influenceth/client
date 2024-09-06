import styled from 'styled-components';

const ThumbnailBottomBanner = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.successDarkRGB}, 0.65);
  bottom: 3px;
  color: white;
  ${p => p.theme.clipCorner(7)};
  display: flex;
  left: 3px;
  justify-content: flex-start;
  padding: 3px;
  position: absolute;
  right: 3px;
  text-shadow: 1px 1px 0px black;
  & > svg {
    filter: drop-shadow(1px 1px 0px black);
  }
`;

export default ThumbnailBottomBanner;