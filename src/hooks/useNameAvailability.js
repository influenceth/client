import { useCallback } from 'react';
import { Name } from '@influenceth/sdk';

import api from '~/lib/api';
import useStore from './useStore';

const useNameAvailability = () => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const validateName = useCallback((entity, suppressAlert) => {
    let err = '';
    let name = entity.Name?.name;

    const standardError = Name.getNameError(name, Name.getType(entity.label));
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

  const getNameAvailability = useCallback(async (entity, suppressAlert) => {
    try {
      if (!validateName(entity, suppressAlert)) return false;
      let name = entity.Name?.name;
      const nameCollisions = await api.getNameUse(entity.label, name);

      if (nameCollisions?.length > 0 && nameCollisions[0].id !== entity.id) {
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
