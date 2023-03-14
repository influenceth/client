import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import usePagedAsteroids from '~/hooks/usePagedAsteroids';
import DataTable from '~/components/DataTable';
import Details, { borderColor } from '~/components/DetailsV2';
import Pagination from '~/components/Pagination';
import listConfigs from './listViews';
import SearchAsteroids from '../hud/hudMenus/SearchAsteroids';
import { trayHeight } from '../hud/hudMenus/components';
import InProgressIcon from '~/components/InProgressIcon';

const footerMargin = 12;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
const UpperWrapper = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  height: 0;
  margin-bottom: ${footerMargin}px;
`;
const FilterContainer = styled.div`
  height: calc(100% + ${trayHeight + footerMargin}px);
  padding-right: 12px;
  width: 360px;

  & > div:last-child {
    border-top: 0;
  }
`;
const TableContainer = styled.div`
  flex: 1;
  height: 100%;
  overflow-x: auto;
`;
const VR = styled.div`
  border-left: 1px solid ${borderColor};
  margin-left: 12px;
  height: 100%;
  padding-left: 24px;
`;
const Tray = styled.div`
  align-items: center;
  border-top: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  height: ${trayHeight}px;
  & > div {
    flex: 1;
  }
`;

const Loading = styled.div`
  color: ${p => p.theme.colors.main};
  display: flex;
  justify-content: center;
`;

const Counts = styled.div`
  display: flex;
  flex-direction: row;
  & > div {
    align-items: center;
    color: white;
    display: flex;
    flex: 1;
    padding: 0 20px;
    text-align: left;

    &:first-child {
      border-right: 1px solid ${borderColor};
      color: ${p => p.theme.colors.main};
      justify-content: flex-end;
      text-align: right;
      &:before {
        background: ${p => p.theme.colors.main};
        content: '';
        display: inline-block;
        height: 8px;
        margin-right: 8px;
        transform: rotate(45deg);
        transform-origin: center center;
        width: 8px;
      }
    }
  }
`;

const assetTypes = {
  asteroids: {
    keyField: 'i',
    title: 'Asteroids',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  }
}

const ListView = ({ assetType, ...props }) => {
  const { keyField, title, useColumns, useHook } = assetTypes[assetType];
  const { query, page, perPage, setPage, sort, setSort } = useHook();
  const [sortField, sortDirection] = sort;

  const columns = useColumns();

  const handleSort = useCallback((field) => () => {
    if (!field) return;

    let updatedSortField = sortField;
    let updatedSortDirection = sortDirection;
    if (field === sortField) {
      updatedSortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      updatedSortField = field;
      updatedSortDirection = 'desc';
    }

    setSort([
      updatedSortField,
      updatedSortDirection
    ]);
  }, [sortDirection, sortField]);

  useEffect(() => {
    if (query?.data?.length === 0) setPage(1);
  }, [ query?.data, setPage ]);

  useEffect(() => ReactTooltip.rebuild(), [query?.data?.hits]);

  return (
    <Details fullWidth title={title} contentProps={{ hasFooter: true }}>
      <Wrapper>
        <UpperWrapper>
          <FilterContainer>
            <SearchAsteroids alwaysTray />
          </FilterContainer>
          <VR />
          <TableContainer>
            <DataTable
              columns={columns}
              data={query?.data?.hits || []}
              keyField={keyField}
              onClickColumn={handleSort}
              sortDirection={sort[1]}
              sortField={sort[0]}
            />
          </TableContainer>
        </UpperWrapper>
        <Tray>
          <div />
          {query?.isLoading
            ? (
              <Loading>
                <InProgressIcon height={14} />
              </Loading>
            )
            : (
              <Counts>
                <div>
                  {(query?.data?.total || 0).toLocaleString()} Result{query?.data?.total === 1 ? '' : 's'}
                </div>
                <div>
                  Showing: {query?.data?.total > 0
                    ? `${((page - 1) * perPage + 1).toLocaleString()} - ${Math.min(page * perPage, query?.data?.total).toLocaleString()}`
                    : 'n/a'
                  }
                </div>
              </Counts>
            )}
          <div>
            <Pagination
              currentPage={page}
              rowsPerPage={perPage}
              rowCount={query?.data?.total || 0}
              onChangePage={setPage} />
          </div>
        </Tray>
      </Wrapper>
    </Details>
  );
};

export default ListView;
