import { useCallback } from 'react';
import { Name } from '@influenceth/sdk';

import api from '~/lib/api';
import useStore from './useStore';

const useNameAvailability = (entityLabel) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const validateName = useCallback((name, suppressAlert) => {
    let err = '';

    const standardError = Name.getNameError(name, Name.getType(entityLabel));
    if (standardError) err = standardError;
    // TODO: move these extras to sdk? only really make sense if also true in the contract
    else if (/^ /.test(name) || / $/.test(name)) err = 'Name cannot have leading or trailing spaces.';
    else if (/ {2,}/.test(name)) err = 'Name cannot have adjoining spaces.';
    if (err) {
      if (!suppressAlert) {
        createAlert({
          type: 'GenericAlert',
          content: err,
          level: 'warning',
          duration: 4000
        });
      }
      return false;
    }
    return true;
  }, [createAlert]);

  const getNameAvailability = useCallback(async (name, suppressAlert) => {
    try {
      if (!validateName(name, suppressAlert)) return false;

      // TODO: ecs refactor - would it make more sense to use entityType here?
      const nameCollisions = await api.getNameUse(entityLabel, name);
      if (nameCollisions?.length > 0) {
        if (!suppressAlert) {
          createAlert({
            type: 'GenericAlert',
            level: 'warning',
            content: `"${name}" is already taken as a name.`,
            duration: 4000
          });
        }
        return false;
      }

      return true;
    } catch (e) {
      return true;  // true on error, wallet will report failure
    }
  }, [createAlert, validateName]);

  return getNameAvailability;
};

export default useNameAvailability;
