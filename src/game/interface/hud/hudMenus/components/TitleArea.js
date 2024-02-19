import styled from 'styled-components';

import { majorBorderColor } from './components';
import hudHeaders from '~/assets/images/hud_headers';

const absPadding = 8;

const Wrapper = styled.div`
  background: url(${p => p.background ? hudHeaders[p.background] : ''}) no-repeat center center;
  background-size: cover;
  border-bottom: 1px solid ${majorBorderColor};
  height: 150px;
  position: relative;
`;
const TitleContainer = styled.div`
  position: absolute;
  bottom: ${absPadding}px;
  left: ${absPadding}px;
  right: ${absPadding}px;
`;
const Title = styled.div`
  font-size: 25px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// const InfoRow = styled.div`
//   align-items: center;
//   border-bottom: 1px solid rgba(255, 255, 255, 0.05);
//   display: flex;
//   flex-direction: row;
//   font-size: 14px;
//   padding: 8px 0;
//   width: 100%;
//   & > svg {
//     color: white;
//     font-size: 24px;
//     margin-right: 10px;
//   }
//   & > label {
//     color: white;
//     flex: 1;
//   }
//   & > span {
//     color: #999;
//   }
// `;
const Subtitle = styled.div`
  color: #999;
  font-size: 14px;
  padding-top: 6px;
  white-space: nowrap;
  & b {
    color: white;
    font-weight: normal;
  }
`;
const UpperContainer = styled.div`
  align-items: center;
  display: flex;
  font-size: 14px;
  justify-content: space-between;
  position: absolute;
  left: ${absPadding}px;
  right: ${absPadding}px;
  top: ${absPadding}px;

  & > div {
    align-items: center;
    display: inline-flex;
    & > svg {
      font-size: 18px;
      margin-right: 2px;
    }
  }
`;
const Overlay = styled.div`
  position: absolute;
  top: 32px;
  left: calc(50% - 25px);
  height: 50px;
  width: 50px;
  font-size: 50px;
  line-height: 0px;
`;

const TitleArea = ({ background, title, overlay, subtitle, upperLeft, upperRight }) => (
  <Wrapper background={background}>
    <UpperContainer>
      <div>{upperLeft}</div>
      <div>{upperRight}</div>
      {overlay && <Overlay>{overlay}</Overlay>}
    </UpperContainer>
    <TitleContainer>
      <Title>{title}</Title>
      <Subtitle>{subtitle}</Subtitle>
    </TitleContainer>
  </Wrapper>
);

export default TitleArea;