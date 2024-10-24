import styled from 'styled-components';
import Button from '~/components/ButtonAlt';

import CrewIndicator from '~/components/CrewIndicator';
import useCrew from '~/hooks/useCrew';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';

const Wrapper = styled.div`
  padding: 10px;
  & > p {
    margin: 10px 0 15px;
    opacity: 0.7;
  }
`;

const SwitchToAdministratingCrew = ({ entity }) => {
  const { selectCrew } = useCrewContext();
  const { data: controller } = useCrew(entity?.Control?.controller?.id);

  if (!controller || !entity) return null;
  return (
    <Wrapper>
      <CrewIndicator crew={controller} label="Administrating Crew" />
      <p>
        {formatters.crewName(controller)} is responsible for administration of {formatters.entityName(entity)}.
        To make updates:
      </p>
      <Button onClick={() => selectCrew(controller.id)}>
        Switch to Crew
      </Button>
    </Wrapper>
  );
};

export default SwitchToAdministratingCrew;