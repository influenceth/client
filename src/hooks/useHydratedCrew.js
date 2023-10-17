import { useMemo } from 'react';
import { cloneDeep } from 'lodash';

import { locationsArrToObj } from '~/lib/utils';
import useCrew from './useCrew';
import useCrewmates from './useCrewmates';

const useHydratedCrew = (id) => {
  const { data: crew, isLoading: crewLoading } = useCrew(id);
  const { data: crewmates, isLoading: crewmatesLoading } = useCrewmates(crew?.Crew?.roster);

  return useMemo(() => {
    let data = null;
    let isLoading = true;
    if (!crewLoading && !crewmatesLoading) {
      data = cloneDeep(crew);
      data._crewmates = crewmates.map((c) => cloneDeep(c));
      data._location = locationsArrToObj(crew.Location?.locations);
      isLoading = false;
    }
    return { data, isLoading };
  }, [crew, crewmates, crewLoading, crewmatesLoading]);
};

export default useHydratedCrew;
