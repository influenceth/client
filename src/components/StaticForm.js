import styled, { css } from 'styled-components';
import LoadingAnimation from 'react-spinners/BarLoader';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import theme from '~/theme';
import ClipCorner from './ClipCorner';

const StyledForm = styled.div`
  align-items: flex-start;
  border: 1px solid ${p => p.theme.colors.main};
  background-color: black;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 9.5px),
    calc(100% - 9.5px) 100%,
    0 100%
  );
  color: white;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  font-size: 15px;
  height: 100%;
  margin-top: 15px;
  padding: 0 15px 10px 10px;
  position: relative;
  width: 100%;

  ${p => p.css || ''}
`;

const Title = styled.div`
  align-items: center;
  display: flex;
  height: 25px;
  padding-top: 10px;

  & svg {
    margin-right: 5px;
  }

  @media (max-width: 380px) {
    display: none;
  }
`;

const Corner = styled.svg`
  bottom: -1px;
  height: 10px;
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${p => p.theme.colors.main};
  stroke-width: 1px;
  width: 10px;
`;

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 3px;
  right: -7px;
`;

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
`;

const StaticForm = (props) => {
  const { children, css, loading, onClose, title } = props;

  return (
    <StyledForm css={css}>
      {loading && <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />}
      <Title>{title}</Title>
      {children}
      <CloseButton onClick={onClose} borderless>
        <CloseIcon />
      </CloseButton>
      <ClipCorner dimension={10} color={theme.colors.main} />
    </StyledForm>
  );
};

export default StaticForm;
