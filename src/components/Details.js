import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';

const StyledDetails = styled.div`
  background-color: ${p => p.theme.colors.contentBackdrop};
  backdrop-filter: blur(4px);
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 35px),
    calc(100% - 35px) 100%,
    0 100%
  );
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  height: 100%;
  margin: 25px 25px 0 25px;
  pointer-events: auto;
  position: relative;
  overflow: hidden;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
    clip-path: none;
    margin: 0 0 50px 0;
    z-index: 1;
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
    margin: 0;
  }
`;

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 17px;
  right: 20px;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const Details = (props) => {
  const { title, edgeToEdge, onCloseDestination, ...restProps } = props;
  const history = useHistory();

  return (
    <StyledDetails {...restProps}>
      {title && <Header>{title}</Header>}
      <CloseButton
        onClick={() => history.push(onCloseDestination || '/')}
        borderless>
        <CloseIcon />
      </CloseButton>
      <Content edgeToEdge={edgeToEdge} hasTitle={!!title}>
        {props.children}
      </Content>
    </StyledDetails>
  );
};

export default Details;
