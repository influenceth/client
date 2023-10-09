import { css } from 'styled-components';
import LoadingAnimation from 'react-spinners/PuffLoader';
import { reactBool } from '~/lib/utils';

const loadingCss = css`
  position: absolute;
  left: calc(50% - 30px);
  top: calc(50% - 30px);
`;

const Loader = ({ overrides }) => (
  <LoadingAnimation
    color="white"
    css={loadingCss}
    loading={reactBool(true)}
    {...overrides} />
);

export default Loader;
