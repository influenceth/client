import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import ClipCorner from './ClipCorner';

export const borderColor = '#333';
const cornerSize = 35;

const Wrapper = styled.div`
  backdrop-filter: blur(2px);
  flex: 1;
  padding: 25px;
  position: relative;
  height: 100%;
  overflow: hidden;
  width: 100%;
  z-index: 4;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0 0 50px 0;
    z-index: 1;
  }
`;

const StyledDetails = styled.div`
  background-color: black;
  border: 1px solid ${borderColor};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    0 100%
  );
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 15px 20px 0;
  pointer-events: auto;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
    clip-path: none;
  }
`;

const headerHeight = 40;
const Header = styled.h1`
  border-left: 2px solid ${p => p.theme.colors.main};
  font-size: 22px;
  font-weight: 400;
  height: ${headerHeight}px;
  line-height: ${headerHeight}px;
  padding: 0 0 0 15px;
  position: relative;
  text-transform: uppercase;
  margin: 0;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-left: 20px;
  }
`;

const ContentWrapper = styled.div`
  border-top: 1px solid ${borderColor};
  flex: 1;
  margin-top: 12px;
  height: 0;
`;

const Content = styled.div`
  height: calc(100% - ${p => p.hasFooter ? 25 : 50}px);
  margin: 25px 0 ${p => p.hasFooter ? 0 : 25};
  min-width: 0;
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  z-index: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: 0;
  }
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
  const { title, contentProps = {}, edgeToEdge, onCloseDestination, ...restProps } = props;
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
        <ContentWrapper>
          <Content edgeToEdge={edgeToEdge} hasTitle={!!title} {...contentProps}>
            {props.children}
          </Content>
        </ContentWrapper>
        <ClipCorner dimension={cornerSize} color={borderColor} />
      </StyledDetails>
    </Wrapper>
  );
};

export default Details;
