import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import usePagedAsteroids from '~/hooks/usePagedAsteroids';
import DataTable from '~/components/DataTable';
import Details, { borderColor } from '~/components/DetailsV2';
import Pagination from '~/components/Pagination';
import listConfigs from './listViews';
import SearchAsteroids, { SearchAsteroidTray } from '../hud/hudMenus/SearchAsteroids';
import { trayHeight } from '../hud/hudMenus/components';
import InProgressIcon from '~/components/InProgressIcon';
import { BuildingIcon, ConstructIcon, CoreSampleIcon, CrewIcon, CrewmateIcon, PlanBuildingIcon, RocketIcon, ScanAsteroidIcon, ShipIcon, SlidersIcon, SwayIcon, TransactionIcon } from '~/components/Icons';
import Button from '~/components/ButtonAlt';
import Dropdown from '~/components/DropdownV2';

const footerMargin = 12;
const filterWidth = 344;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100% - 1px);
  padding-top: 15px;
`;
const Controls = styled.div`
  display: flex;
  flex-direction: row;
  height: 44px;
  width: 100%;
`;
const LeftControls = styled.div`
  display: flex;
  padding-left: 10px;
  width: 344px;
  border-right: 1px solid ${p => p.filtersOpen ? borderColor : 'transparent'};
  transition: border-color 250ms ease;
`;
const MainWrapper = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  height: 0;
  margin-bottom: ${footerMargin}px;
`;
const FilterContainer = styled.div`
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  transition: margin 250ms ease, width 250ms ease;

  ${p => p.open
    ? `
      border-right: 1px solid ${borderColor};
      margin-right: 16px;
      width: ${filterWidth}px;
    `
    : `
      border-right: 1px solid transparent;
      margin-right: 0;
      width: 0;
    `
  }

  & > div:last-child {
    border-top: 0;
  }
`;
const InnerFilterContainer = styled.div`
  height: 100%;
  overflow: hidden;
  width: ${filterWidth - 16}px;
`;
const TableContainer = styled.div`
  flex: 1;
  height: 100%;
  overflow-x: auto;
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
    icon: <ScanAsteroidIcon />, // TODO
    title: 'Asteroids',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  crewmates: {
    keyField: 'i',
    icon: <CrewmateIcon />,
    title: 'Crewmates',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  crews: {
    keyField: 'i',
    icon: <CrewIcon />,
    title: 'Crews',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  buildings: {
    keyField: 'i',
    icon: <BuildingIcon />,
    title: 'Buildings',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  coreSamples: {
    keyField: 'i',
    icon: <CoreSampleIcon />,
    title: 'Core Samples',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  ships: {
    keyField: 'i',
    icon: <ShipIcon />,
    title: 'Ships',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  marketOrders: {
    keyField: 'i',
    icon: <RocketIcon />, // TODO
    title: 'Market Orders',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  leases: {
    keyField: 'i',
    icon: <RocketIcon />, // TODO
    title: 'Leases',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  actions: {
    keyField: 'i',
    icon: <RocketIcon />, // TODO
    title: 'Actions',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
  transactions: {
    keyField: 'i',
    icon: <TransactionIcon />,
    title: 'Transactions',
    useColumns: listConfigs.asteroids,
    useHook: usePagedAsteroids,
  },
}

const assetsAsOptions = Object.keys(assetTypes).map((key) => ({
  value: key,
  label: assetTypes[key].title,
  icon: assetTypes[key].icon
}));

const ListView = ({ assetType, ...props }) => {
  const { keyField, title, useColumns, useHook } = assetTypes[assetType];
  const { query, page, perPage, setPage, sort, setSort } = useHook();
  const [sortField, sortDirection] = sort;

  const columns = useColumns();

  const [disabledColumns, setDisabledColumns] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState();

  const onToggleFilters = useCallback(() => {
    setFiltersOpen((o) => !o);
  }, []);
  
  const onClickFilters = useCallback(() => {
    setFiltersOpen(true);
  }, []);

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

  // on asset type change
  useEffect(() => {
    setDisabledColumns([]);
    setPage(1);
  }, [assetType, setPage])

  useEffect(() => ReactTooltip.rebuild(), [query?.data?.hits]);

  const enabledColumns = useMemo(() => {
    console.log(columns)
    return columns.filter((c) => !disabledColumns.includes(c.key));
  }, [columns, disabledColumns]);

  return (
    <Details fullWidth title={title} contentProps={{ hasFooter: true }}>
      <Wrapper>
        <Controls>
          <LeftControls filtersOpen={filtersOpen}>
            <Dropdown
              initialSelection={assetsAsOptions[0]}
              isActive
              onChange={() => {}}
              options={assetsAsOptions}
              width="280px" />
            <div style={{ marginLeft: 6 }}>
              <Button
                data-for="global"
                data-place="right"
                data-tip={filtersOpen ? 'Hide Filters' : 'Show Filters'}
                color={filtersOpen ? 'transparent' : undefined}
                onClick={onToggleFilters}
                size="icon">
                <SlidersIcon />
              </Button>
            </div>
          </LeftControls>
        </Controls>

        <MainWrapper>
          <FilterContainer open={filtersOpen}>
            <InnerFilterContainer>
              <SearchAsteroids hideTray />
            </InnerFilterContainer>
          </FilterContainer>
          <TableContainer>
            <DataTable
              columns={enabledColumns}
              data={query?.data?.hits || []}
              keyField={keyField}
              onClickColumn={handleSort}
              sortDirection={sort[1]}
              sortField={sort[0]}
            />
          </TableContainer>
        </MainWrapper>
        <Tray>
          <div>
            <SearchAsteroidTray borderless onClickFilters={onClickFilters} />
          </div>
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
