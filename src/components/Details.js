import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { MdClose } from 'react-icons/md';

import IconButton from '~/components/IconButton';

const StyledDetails = styled.div`
  background-color: ${props => props.theme.colors.contentBackdrop};
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
  flex: 1 1 auto;
  margin: 25px 44px 0 25px;
  padding: 25px 35px 35px 25px;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  height: 100%;
`;

const Header = styled.h1`
  font-size: 24px;
  font-weight: 400;
  padding: 10px 0 40px 0;
  margin: 0;
`;

const Content = styled.div`
  overflow-y: scroll;
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  top: 35px;
  right: 25px;
`;

const Details = (props) => {
  const history = useHistory();

  return (
    <StyledDetails {...props}>
      {props.title && <Header>{props.title}</Header>}
      <CloseButton
        onClick={() => history.push('/')}
        borderless>
        <MdClose />
      </CloseButton>
      <Content>
        {props.children}
      </Content>
    </StyledDetails>
  );
};

export default Details;
