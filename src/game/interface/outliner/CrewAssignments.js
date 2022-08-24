import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import useCrewAssignments from '~/hooks/useCrewAssignments';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import { ChapterIcon, DetailIcon, RocketIcon } from '~/components/Icons';
import Section from '~/components/Section';
import useOwnedCrew from '~/hooks/useOwnedCrew';

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  padding-bottom: 15px;
`;

const AssignmentsList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 10px 0 0;
  scrollbar-width: thin;
`;

const StyledButton = styled(Button)`
  margin: 0 !important;
  min-height: 30px !important;
  white-space: nowrap;
  width: auto !important;
`;

const EmptyMessage = styled.div`
  line-height: 30px;
  opacity: 0.6;
`;

const BookTitle = styled.div`
  font-size: 120%;
  opacity: 0.6;
  padding: 6px 0;
  &:first-child {
    padding-top: 0;
  }
`;

const ChapterRow = styled.div`
  align-items: center;
  cursor: ${props => props.theme.cursors.active};
  display: flex;
  font-weight: bold;
  height: 28px;
  & > svg {
    font-size: 110%;
    margin: 0 8px;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const CrewAssignments = (props) => {
  const history = useHistory();
  const { data: assignmentData } = useCrewAssignments();
  const { assignmentsByBook, totalAssignments } = assignmentData || {};

  const actionableBooks = useMemo(
    () => (assignmentsByBook || []).filter((b) => b.actionable),
    [assignmentsByBook]
  );

  const handleClick = useCallback((story) => () => {
    if (story && story.book) {
      history.push(`/crew-assignments/${story.book.id}/${story.id}`);
    } else if(actionableBooks?.length > 0) {
      history.push(`/crew-assignments/${actionableBooks[0].id}`);
    } else if(assignmentsByBook?.length > 0) {
      history.push(`/crew-assignments/${assignmentsByBook[0].id}`);
    }
  }, [actionableBooks, assignmentsByBook, history]);

  // TODO: genesis book deprecation vvv
  const { data: crew } = useOwnedCrew();
  const hasGenesisCrewmate = useMemo(() => {
    return crew && !!crew.find((c) => [1,2,3].includes(c.crewCollection))
  }, [crew?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hasGenesisCrewmate) return null;
  // ^^^

  return (
    <Section
      name="crewAssignments"
      title="Crew Assignments"
      icon={<RocketIcon />}>
      <Controls>
        <IconButton
          data-tip="Details"
          disabled={(assignmentsByBook || []).length === 0}
          onClick={handleClick()}>
          <DetailIcon />
        </IconButton>
        {totalAssignments > 0 && (
          <StyledButton badge={totalAssignments} onClick={handleClick()}>
            New Assignments Available
          </StyledButton>
        )}
        {totalAssignments === 0 && (
          <EmptyMessage>No New Assignments</EmptyMessage>
        )}
      </Controls>
      {actionableBooks?.length > 0 && (
        <AssignmentsList>
          {actionableBooks.map(book => (
            <React.Fragment key={book.id}>
              <BookTitle>{book.title}</BookTitle>
              {book.stories.filter(story => story.actionable > 0).map(story => (
                <ChapterRow key={story.id} onClick={handleClick(story)}>
                  <ChapterIcon /> {story.title}
                </ChapterRow>
              ))}
            </React.Fragment>
          ))}
        </AssignmentsList>
      )}
    </Section>
  );
};

export default CrewAssignments;
