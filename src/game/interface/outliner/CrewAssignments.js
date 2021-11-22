import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { ChapterIcon, RocketIcon } from '~/components/Icons';

import useBooks from '~/hooks/useBooks';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import ListHoverItem from '~/components/ListHoverItem';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import ListEmptyMessage from '~/components/ListEmptyMessage';

const AssignmentsList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
`;

const FlexTitle = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding-right: 6px;
`;

const Badge = styled.div`
  background: ${p => p.theme.colors.main};
  border-radius: 50%;
  color: white;
  display: flex;
  font-size: 85%;
  font-weight: bold;
  height: 1.4em;
  align-items: center;
  justify-content: center;
  width: 1.4em;
`;

const CrewAssignments = (props) => {
  const history = useHistory();
  const { data: books } = useBooks();
  const { data: crew } = useOwnedCrew();

  return (
    <Section
      name="crewAssignments"
      title="Crew Assignments"
      icon={<RocketIcon />}>
      <AssignmentsList>
        {books?.length === 0 && (
          <ListEmptyMessage><span>No crew assignments available.</span></ListEmptyMessage>
        )}
        {books?.length > 0 && books.map(book => {
          const badgeValue = (crew?.length || 0) - (book.stats?.completed || 0);
          return (
            <ListHoverItem
              key={book.id}
              title={(
                <FlexTitle>
                  <div>{book.title}</div>
                  {badgeValue > 0 && <Badge>{badgeValue}</Badge>}
                </FlexTitle>
              )}
              hoverContent={(
                <IconButton
                  data-tip={`Assignment Details`}
                  onClick={() => history.push(`/crew-assignments/${book.id}`)}>
                  <ChapterIcon />
                </IconButton>
              )}
            />
          );
        })}
      </AssignmentsList>
    </Section>
  );
};

export default CrewAssignments;
