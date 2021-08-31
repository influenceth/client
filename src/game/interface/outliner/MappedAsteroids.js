import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import usePagedAsteroids from '~/hooks/usePagedAsteroids';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import AsteroidItem from '~/components/AsteroidItem';
import ListEmptyMessage from '~/components/ListEmptyMessage';
import { MapIcon, PreviousIcon, NextIcon, TableIcon } from '~/components/Icons';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const AsteroidList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
`;

const MappedAsteroids = (props) => {
  const history = useHistory();
  const perPage = 25;
  const { query, setPage, setPerPage } = usePagedAsteroids();
  const [ currentPage, setCurrentPage ] = useState(1);

  useEffect(() => {
    setPage(currentPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ currentPage ]);

  useEffect(() => {
    setPerPage(perPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Section
      name="mappedAsteroids"
      title="Mapped Asteroids"
      icon={<MapIcon />}>
      <Controls>
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/asteroids')}>
          <TableIcon />
        </IconButton>
        <IconButton
          data-tip="Previous Page"
          disabled={!query?.data || currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}>
          <PreviousIcon />
        </IconButton>
        <IconButton
          data-tip="Next Page"
          disabled={!query?.data || query?.data.length < perPage}
          onClick={() => setCurrentPage(currentPage + 1)}>
          <NextIcon />
        </IconButton>
      </Controls>
      <AsteroidList>
        {(!query?.data || query?.data?.length === 0) && (
          <ListEmptyMessage><span>No mapped asteroids</span></ListEmptyMessage>
        )}
        {query?.data && query.data.map(a => <AsteroidItem key={a.i} asteroid={a} />)}
      </AsteroidList>
    </Section>
  );
};

export default MappedAsteroids;
