import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';

const Wrapper = styled.div`
  flex: 1 1 0;
  max-width: ${p => p.fullWidth ? 'none' : (p.maxWidth || '1400px')};
  padding: 25px 25px 0;
  position: relative;
  overflow: hidden;
  width: 100%;
  z-index: 3;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0 0 50px 0;
    z-index: 1;
  }
`;

const StyledDetails = styled.div`
  background-color: ${p => p.theme.colors.contentBackdrop};
  backdrop-filter: blur(4px);
  ${p => p.theme.clipCorner(35)};
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
    clip-path: none;
  }
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
  min-width: 0;
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  z-index: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: ${p => p.edgeToEdge && p.hasTitle ? '-60px 0 0' : '0'};
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
        <Content edgeToEdge={edgeToEdge} hasTitle={!!title} {...contentProps}>
          {props.children}
        </Content>
      </StyledDetails>
    </Wrapper>
  );
};

export default Details;
