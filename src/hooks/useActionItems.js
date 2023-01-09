import { useContext } from 'react';

import ActionItemContext from '~/contexts/ActionItemContext';

const useActionItems = () => {
  return useContext(ActionItemContext);
};

export default useActionItems;
