import { useCallback, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useHistory } from 'react-router-dom';
import { Entity } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import { CrewInputBlock } from '../actionDialogs/components';
import { locationsArrToObj } from '~/lib/utils';
import useStore from '~/hooks/useStore';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import { WarningIcon } from '~/components/Icons';
import EntityName from '~/components/EntityName';
import TextInput from '~/components/TextInputUncontrolled';

const defaultBlockStyle = { marginBottom: 8, width: '100%' };

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

const crewRowHeight = 141;
const locationTitleHeight = 36;
const locationExtraMargin = 5;

const MyCrews = () => {
  const { crew, crews, crewmateMap, selectCrew } = useCrewContext();
  const [searchFilter, setSearchFilter] = useState('');

  const filteredCrews = useMemo(() => {
    if (!searchFilter) return crews;
    return crews.filter((c) => (c.Name?.name || '').toLowerCase().includes(searchFilter.toLowerCase()));
  }, [crews, searchFilter]);

  const nonEmptyCrews = useMemo(() => filteredCrews.filter((c) => c.Crew.roster.length > 0), [filteredCrews]);
  const emptyCrews = useMemo(() => filteredCrews.filter((c) => c.Crew.roster.length === 0), [filteredCrews]);

  const nonEmptyCrewsByLocation = useMemo(() => {
    return nonEmptyCrews.reduce((acc, cur) => {
      const asteroidId = locationsArrToObj(cur.Location.locations)?.asteroidId || '_';
      const locationKey = JSON.stringify(locationsArrToObj(cur.Location.locations));
      if (!acc[asteroidId]) acc[asteroidId] = { locations: {}, tally: 0 };
      if (!acc[asteroidId].locations[locationKey]) acc[asteroidId].locations[locationKey] = [];
      acc[asteroidId].locations[locationKey].push(cur);
      acc[asteroidId].tally++
      return acc;
    }, {});
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

  const asteroidContainerHeights = useMemo(() => {
    return Object.keys(nonEmptyCrewsByLocation || {}).reduce((acc, asteroidId) => {
      const asteroidCrewTally = nonEmptyCrewsByLocation[asteroidId].tally;
      const asteroidLocationTally = Object.keys(nonEmptyCrewsByLocation[asteroidId].locations).length;
      acc[asteroidId] = asteroidCrewTally * crewRowHeight + asteroidLocationTally * (locationTitleHeight + locationExtraMargin);
      return acc;
    }, {});
  }, [nonEmptyCrewsByLocation])

  return (
    <Scrollable>
      <TextInput
        autoFocus
        onChange={(e) => setSearchFilter(e.target.value)}
        placeholder="Filter by Crew..."
        value={searchFilter || ''}
        width={185}
        style={{ marginTop: '10px' }} />
      {Object.keys(nonEmptyCrewsByLocation || {}).map((asteroidId) => (
        <HudMenuCollapsibleSection
          key={asteroidId}
          containerHeight={asteroidContainerHeights[asteroidId]}
          titleText={asteroidId === '_' ? 'In Flight' : <EntityName label={Entity.IDS.ASTEROID} id={asteroidId} />}
          titleLabel={`${nonEmptyCrewsByLocation[asteroidId].tally} Crew${nonEmptyCrewsByLocation[asteroidId].tally === 1 ? '' : 's'}`}>
          {Object.keys(nonEmptyCrewsByLocation[asteroidId].locations).map((locationKey) => {
            const locationCrews = nonEmptyCrewsByLocation[asteroidId].locations[locationKey];
            const location = locationsArrToObj(locationCrews[0]?.Location?.locations || []);
            return (
              <HudMenuCollapsibleSection
                key={locationKey}
                containerHeight={crewRowHeight * locationCrews.length}
                titleProps={{ style: { textTransform: 'none' } }}
                titleText={asteroidId === '_' && !location?.shipId ? 'Escape Module' : <EntityName {...locationCrews[0]?.Location?.location} />}>
                {(locationCrews || []).map((c) => (
                  <CrewInputBlock
                    key={c.id}
                    cardWidth={64}
                    crew={c}
                    inlineDetails
                    isSelected={c.id === crew?.id}
                    onClick={() => selectCrew(c.id)}
                    subtle
                    style={defaultBlockStyle} />
                ))}
              </HudMenuCollapsibleSection>
            );
          })}
        </HudMenuCollapsibleSection>
      ))}

      {Object.keys(uncontrolledCrewIds)?.length > 0 && (
        <HudMenuCollapsibleSection
          titleText={<AttnTitle><WarningIcon /> <span>Recoverable Crewmates</span></AttnTitle>}
          titleLabel={`${Object.keys(uncontrolledCrewIds)?.length} Crew${Object.keys(uncontrolledCrewIds)?.length === 1 ? '' : 's'}`}>
          {Object.keys(uncontrolledCrewIds || {}).map((crewId) => (
            <UncontrolledCrewBlock key={crewId} crewId={crewId} crewmateIds={uncontrolledCrewIds[crewId]} />
          ))}
        </HudMenuCollapsibleSection>
      )}

      {emptyCrews.length > 0 && (
        <HudMenuCollapsibleSection
          titleText="Empty Crews"
          titleLabel={`${emptyCrews?.length} Crew${emptyCrews?.length === 1 ? '' : 's'}`}>
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
        </HudMenuCollapsibleSection>
      )}
    </Scrollable>
  );
};

export default MyCrews;