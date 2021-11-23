import { css } from 'styled-components';
import LoadingAnimation from 'react-spinners/PuffLoader';

const loadingCss = css`
  position: absolute;
  left: calc(50% - 30px);
  top: calc(50% - 30px);
`;

const Loader = ({ overrides }) => (
  <LoadingAnimation
    color="white"
    css={loadingCss}
    loading={true}
    {...overrides} />
);

export default Loader;
