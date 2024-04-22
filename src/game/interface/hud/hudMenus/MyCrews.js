import { useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useHistory } from 'react-router-dom';

import useCrewContext from '~/hooks/useCrewContext';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import { CrewInputBlock } from '../actionDialogs/components';
import { locationsArrToObj } from '~/lib/utils';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import useStore from '~/hooks/useStore';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import { WarningIcon } from '~/components/Icons';

const defaultBlockStyle = { marginBottom: 8, width: '100%' };

const SectionBody = styled.div``;

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

const AttnTitle = styled.span`
  align-items: center;
  display: flex;
  & > svg {
    animation: ${opacityAnimation} 1250ms ease infinite;
    color: ${p => p.theme.colors.warning};
    font-size: 22px;
    margin-right: 5px;
  }
`;

const LocationCrews = ({ locationCrews, selectedCrewId, onSelectCrew }) => {
  const hydratedLocation = useHydratedLocation(locationsArrToObj(locationCrews[0].Location.locations));
  return (
    <HudMenuCollapsibleSection
      titleText={<CrewLocationLabel hydratedLocation={hydratedLocation} style={{ fontSize: 'inherit' }} />}>
      <SectionBody>
        {(locationCrews || []).map((crew, i) => {
          return (
            <CrewInputBlock
              key={crew.id}
              cardWidth={64}
              crew={crew}
              inlineDetails
              isSelected={crew.id === selectedCrewId}
              onClick={() => onSelectCrew(crew)}
              subtle
              style={defaultBlockStyle} />
          );
        })}
      </SectionBody>
    </HudMenuCollapsibleSection>
  );
}

const UncontrolledCrewBlock = ({ crewId, crewmateIds }) => {
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const { data: crew } = useHydratedCrew(crewId);
  const history = useHistory();

  const onClick = useCallback(() => {
    history.push(`/crew/${crewId}`);
    dispatchLauncherPage();
  }, [crewId]);

  if (!crew) return null;
  return (
    <CrewInputBlock
      cardWidth={64}
      crew={crew}
      highlightCrewmates={crewmateIds}
      inlineDetails
      onClick={onClick}
      subtle
      style={defaultBlockStyle} />
  );
};

const MyCrews = () => {
  const { crew, crews, crewmateMap, selectCrew } = useCrewContext();
  
  const nonEmptyCrews = useMemo(() => crews.filter((c) => c.Crew.roster.length > 0), [crews]);
  const emptyCrews = useMemo(() => crews.filter((c) => c.Crew.roster.length === 0), [crews]);

  const nonEmptyCrewsByLocation = useMemo(() => {
    const groupedCrews = nonEmptyCrews.reduce((acc, cur) => {
      const locationKey = JSON.stringify(locationsArrToObj(cur.Location.locations));
      if (!acc[locationKey]) acc[locationKey] = [];
      acc[locationKey].push(cur);
      return acc;
    }, {});
    return Object.values(groupedCrews);
  }, [nonEmptyCrews]);

  const uncontrolledCrewIds = useMemo(() => {
    return Object.keys(crewmateMap || {})
      .filter((id) => !crews.find((c) => c.id === crewmateMap[id].Control?.controller?.id))
      .reduce((acc, crewmateId) => {
        const crewId = crewmateMap[crewmateId].Control?.controller?.id;
        if (!crewId) return acc;
        if (!acc[crewId]) acc[crewId] = [];
        acc[crewId].push(Number(crewmateId));
        return acc;
      }, {});
  }, [crewmateMap]);

  return (
    <Scrollable>
      {(nonEmptyCrewsByLocation || []).map((locationCrews, i) => (
        <LocationCrews
          key={i}
          locationCrews={locationCrews}
          selectedCrewId={crew?.id}
          onSelectCrew={(c) => selectCrew(c.id)} />
      ))}

      {Object.keys(uncontrolledCrewIds)?.length > 0 && (
        <HudMenuCollapsibleSection
          titleText={<AttnTitle><WarningIcon /> <span>Recoverable Crewmates</span></AttnTitle>}
          collapsed>
          <SectionBody>
            {Object.keys(uncontrolledCrewIds || {}).map((crewId) => (
              <UncontrolledCrewBlock key={crewId} crewId={crewId} crewmateIds={uncontrolledCrewIds[crewId]} />
            ))}
          </SectionBody>
        </HudMenuCollapsibleSection>
      )}
      
      <HudMenuCollapsibleSection titleText="Empty Crews" collapsed>
        <SectionBody>
          {emptyCrews.map((emptyCrew) => {
            return (
              <CrewInputBlock
                key={emptyCrew.id}
                cardWidth={64}
                crew={emptyCrew}
                hideCrewmates
                inlineDetails
                select
                isSelected={emptyCrew.id === crew?.id}
                onClick={() => selectCrew(emptyCrew.id)}
                subtle
                style={defaultBlockStyle} />
            );
          })}
        </SectionBody>
      </HudMenuCollapsibleSection>
    </Scrollable>
  );
};

export default MyCrews;