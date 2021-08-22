import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { MdClose } from 'react-icons/md';

import IconButton from '~/components/IconButton';

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
`;

const Header = styled.h1`
  border-left: 5px solid ${p => p.theme.colors.main};
  font-size: 24px;
  font-weight: 400;
  height: 60px;
  line-height: 60px;
  padding: 0 0 0 30px;
  margin: 0;
`;

const Content = styled.div`
  flex: 1 1 0;
  overflow-y: scroll;
  margin: 25px 35px 35px 25px;
  min-width: 0;
  position: relative;
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  top: 25px;
  right: 20px;
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
