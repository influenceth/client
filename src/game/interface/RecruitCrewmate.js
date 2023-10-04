import { useHistory, useParams } from 'react-router-dom';

import SelectHabitatDialog from '~/components/SelectHabitatDialog';
import CrewAssignmentCreate from '~/game/interface/details/crewAssignments/Create';
import CrewAssignment from '~/game/interface/details/crewAssignments/Assignment';
import SelectUninitializedCrewmateDialog from '~/components/SelectUninitializedCrewmateDialog';
import { useCallback } from 'react';

// /recruit/:crewId -- select location IF crew is 0
// /recruit/:crewId/:locationId -- select crewmate credit
// /recruit/:crewId/:locationId/:crewmateId -- crewmate assignment
// /recruit/:crewId/:locationId/:crewmateId/create -- crewmate creation
const RecruitCrewmate = () => {
  const history = useHistory();
  const { locationId, crewId, crewmateId, page } = useParams();

  // TODO: validate...
  // - crewId is 0 or is owned by account
  // - crewId is 0 or is at locationId
  // - if crewId > 0, crewId is not full
  // - if locationId > 0. locationId is a habitat

  const onSelectAssignedHabitat = useCallback((locationId) => {
    history.push(`/recruit/0/${locationId}/`)
  }, []);

  const onRejectAssignedHabitat = useCallback(() => {
    history.push('/');
  }, []);

  const onSelectCrewmate = useCallback((crewmateId) => {
    history.push(`/recruit/${crewId}/${locationId}/${crewmateId}`);
  }, [crewId, locationId]);

  const onFinishAssignment = useCallback(() => {
    history.push(`/recruit/${crewId}/${locationId}/${crewmateId}/create`);
  }, [crewId, locationId, crewmateId]);

  if (locationId === undefined) {
    return <SelectHabitatDialog onAccept={onSelectAssignedHabitat} onReject={onRejectAssignedHabitat} />;
  }
  if (crewmateId === undefined) {
    return <SelectUninitializedCrewmateDialog onSelect={onSelectCrewmate} />;
  }
  if (page === 'create') {
    return (
      <CrewAssignmentCreate
        crewId={Number(crewId)}
        crewmateId={Number(crewmateId)}
        locationId={Number(locationId)}
        backLocation={`/recruit/${crewId}/${locationId}/${crewmateId}`}
      />
    );
  }
  return (
    <CrewAssignment
      crewId={Number(crewId)}
      crewmateId={Number(crewmateId)}
      onFinish={onFinishAssignment} />
  );
};

export default RecruitCrewmate;