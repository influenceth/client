import { css } from 'styled-components';
import { useIsFetching } from 'react-query'
import LoadingAnimation from 'react-spinners/BarLoader';

import theme from '~/theme';

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
  z-index: 1;
`;

const QueryLoader = () => {
  const isFetching = useIsFetching();
  return isFetching
    ? <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />
    : null;
}

export default QueryLoader;