import { useCallback } from 'react';
import { Name } from '@influenceth/sdk';

import api from '~/lib/api';
import useStore from './useStore';

const useNameAvailability = (entityType) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const getNameAvailability = useCallback(async (name, entityId, skipCollisionCheck = false, returnType = 'alert') => {
    try {
      let nameError = null;

      const standardError = Name.getNameError(name, Name.getType(entityType));
      if (standardError) {
        nameError = standardError;
      
      // TODO: vvv move these extras to sdk? only really make sense if also true in the contract
      } else if (/^ /.test(name) || / $/.test(name)) {
        nameError = 'Name cannot have leading or trailing spaces.';
      } else if (/ {2,}/.test(name)) {
        nameError = 'Name cannot have adjoining spaces.';
      } else if (!/^[a-zA-Z0-9\s]+$/i.test(name)) { // letters, numbers, and spaces only
        nameError = 'Name contains invalid characters.';
      } else if (!skipCollisionCheck) {
        const nameCollisions = await api.getNameUse(entityType, name);
        if (nameCollisions?.length > 0 && nameCollisions[0].id !== entityId) {
          nameError = `The name "${name}" is already taken.`;
        }
      }

      if (nameError) {
        if (returnType === 'alert') {
          createAlert({
            type: 'GenericAlert',
            level: 'warning',
            data: { content: nameError },
            duration: 4000
          });
          // fallthrough to return false
        } else if (returnType === 'string') {
          return nameError;
        }
        return false;
      }
      return true;
    } catch (e) {
      return true;  // true on thrown error, wallet will report failure
    }
  }, [createAlert]);

  return getNameAvailability;
};

export default useNameAvailability;
