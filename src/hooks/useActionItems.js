import { useContext } from '~/lib/react-debug';

import ActionItemContext from '~/contexts/ActionItemContext';

const useActionItems = () => {
  return useContext(ActionItemContext);
};

export default useActionItems;
