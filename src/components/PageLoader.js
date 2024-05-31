import { PuffLoader as Loader } from 'react-spinners';

const PageLoader = (props) => {
  return (
    <div style={{ alignItems: 'center', display: 'flex', height: '100%', justifyContent: 'center', width: '100%'}}>
      <Loader size="60px" color="white" {...props} />
    </div>
  );
};

export default PageLoader;