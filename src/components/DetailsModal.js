import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';

const defaultMaxWidth = '1400px';
const cornerWidth = '35px';

const Wrapper = styled.div`
  align-items: center;
  backdrop-filter: blur(2px);
  bottom: 0;
  display: flex;
  left: 0;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  padding: 50px 25px 75px;
  pointer-events: all;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 3;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0 0 50px 0;
    z-index: 1;
  }
`;

const StyledDetails = styled.div`
  background-color: black;
  border: 1px solid ${p => p.theme.colors.borderBottom};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerWidth}),
    calc(100% - ${cornerWidth}) 100%,
    0 100%
  );
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: ${p => p.maxWidth || defaultMaxWidth};
  overflow: hidden;
  pointer-events: auto;
  position: relative;
  width: auto;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
    clip-path: none;
  }
`;

const Corner = styled.svg`
  bottom: -1px;
  height: ${cornerWidth};
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${p => p.theme.colors.borderBottom};
  stroke-width: 1px;
  width: ${cornerWidth};
`;

const headerHeight = 60;
const Header = styled.h1`
  border-left: 5px solid ${p => p.theme.colors.main};
  font-size: 24px;
  font-weight: 400;
  height: ${headerHeight}px;
  line-height: ${headerHeight}px;
  padding: 0 0 0 30px;
  position: relative;
  margin: 0;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-left: 20px;
  }
`;

const Content = styled.div`
  flex: 1 1 0;
  ${p => {
    if (p.edgeToEdge) {
      if (p.hasTitle) {
        return 'margin: -60px 0 0;';
      }
      return 'margin: 0;';
    }
    return 'margin: 25px 35px 35px 25px;';
  }}
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  z-index: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: ${p => p.edgeToEdge && p.hasTitle ? '-60px 0 0' : '0'};
  }
`;

const ContentWrapper = styled.div`
  height: 100%;
  max-width: 100%;
  width: ${p => p.width === 'max' ? (p.maxWidth || defaultMaxWidth) : (p.width || 'auto')};
`;

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 17px;
  right: 20px;
  z-index: 1;
  ${p => p.hasBackground ? 'background: rgba(0, 0, 0, 0.75);' : ''}

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const Details = (props) => {
  const { title, contentProps = {}, edgeToEdge, onCloseDestination, width, ...restProps } = props;
  const history = useHistory();

  return (
    <Wrapper {...restProps}>
      <StyledDetails {...restProps}>
        {title && <Header>{title}</Header>}
        <CloseButton
          onClick={() => history.push(onCloseDestination || '/')}
          hasBackground={edgeToEdge}
          borderless>
          <CloseIcon />
        </CloseButton>
        <Content edgeToEdge={edgeToEdge} hasTitle={!!title} {...contentProps}>
          <ContentWrapper width={width}>
            {props.children}
          </ContentWrapper>
        </Content>
        <Corner viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" color={props.color}>
          <line x1="0" y1="10" x2="10" y2="0" />
        </Corner>
      </StyledDetails>
    </Wrapper>
  );
};

export default Details;
