import { PuffLoader as Loader } from 'react-spinners';

const PageLoader = ({ message, ...props }) => {
  return (
    <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', width: '100%'}}>
      <Loader size="60px" color="white" {...props} />
      <div>{message}</div>
    </div>
  );
};

export default PageLoader;