import { useCallback } from 'react';

import api from '~/lib/api';
import useStore from './useStore';

const useNameAvailability = (i) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const validateName = useCallback((name, suppressAlert) => {
    let err = '';
    if (name.length === 0) err = 'Name field cannot be empty.';
    else if (name.length > 31) err = 'Name is too long.';
    else if (/^ /.test(name) || / $/.test(name)) err = 'Name cannot have leading or trailing spaces.';
    else if (/ {2,}/.test(name)) err = 'Name cannot have adjoining spaces.';
    else if (/[^a-zA-Z0-9 ]/.test(name)) err = 'Name can only contain letters and numbers.';
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

  const getAsteroidNameAvailability = useCallback(async (name, suppressAlert) => {
    try {
      if (!validateName(name, suppressAlert)) return false;

      // TODO: switch this to use elasticsearch?
      const existingAsteroids = await api.getAsteroids({ name });
      if (existingAsteroids?.length > 0) {
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

  const getCrewNameAvailability = useCallback(async (name, suppressAlert) => {
    try {
      if (!validateName(name, suppressAlert)) return false;

      const existingCrewmates = await api.getCrewMembers({ name });
      if (existingCrewmates?.length > 0) {
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

  return {
    getAsteroidNameAvailability,
    getCrewNameAvailability,
  };
};

export default useNameAvailability;
