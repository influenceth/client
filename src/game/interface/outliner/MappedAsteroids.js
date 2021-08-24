import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { RiTableFill } from 'react-icons/ri';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md';

import usePagedAsteroids from '~/hooks/usePagedAsteroids';
import useAsteroidsCount from '~/hooks/useAsteroidsCount';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import AsteroidItem from '~/components/AsteroidItem';
import ListEmptyMessage from '~/components/ListEmptyMessage';

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
  const { query, setPage } = usePagedAsteroids();
  const { data: count } = useAsteroidsCount();
  const [ currentPage, setCurrentPage ] = useState(1);
  const [ lastPage, setLastPage ] = useState(1);

  useEffect(() => {
    setPage(currentPage);
  }, [ currentPage ]);

  useEffect(() => {
    const newLastPage = Math.ceil(count / 25);
    setLastPage(newLastPage);
    if (currentPage > newLastPage) setCurrentPage(newLastPage);
  }, [ count, setLastPage ]);

  return (
    <Section
      name="mappedAsteroids"
      title="Mapped Asteroids"
      icon={<FaMapMarkedAlt />}>
      <Controls>
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/asteroids')}>
          <RiTableFill />
        </IconButton>
        <IconButton
          data-tip="Previous Page"
          disabled={!query?.data || currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}>
          <MdNavigateBefore />
        </IconButton>
        <IconButton
          data-tip="Next Page"
          disabled={!query?.data || currentPage === lastPage}
          onClick={() => setCurrentPage(currentPage + 1)}>
          <MdNavigateNext />
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
