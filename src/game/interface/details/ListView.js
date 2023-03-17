import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import usePagedAssets from '~/hooks/usePagedAssets';
import DataTable from '~/components/DataTable';
import Details, { borderColor } from '~/components/DetailsV2';
import Pagination from '~/components/Pagination';
import SearchFilters from '~/components/SearchFilters';
import SearchFilterTray from '~/components/SearchFilterTray';
import InProgressIcon from '~/components/InProgressIcon';
import {
  BuildingIcon,
  ColumnsIcon,
  CoreSampleIcon,
  CrewIcon,
  CrewmateIcon,
  RocketIcon,
  ScanAsteroidIcon,
  ShipIcon,
  SlidersIcon,
  TransactionIcon
} from '~/components/Icons';
import Button from '~/components/ButtonAlt';
import Dropdown from '~/components/DropdownV2';
import { useHistory, useParams } from 'react-router-dom';
import Multiselect from '~/components/Multiselect';
import listConfigs from './listViews';

const footerMargin = 12;
const filterWidth = 344;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100% - 1px);
`;
const Controls = styled.div`
  display: flex;
  flex-direction: row;
  height: 59px;
  padding: 10px 10px 0;
  width: 100%;
  & > div {
    padding-bottom: 5px;
  }
`;
const LeftControls = styled.div`
  display: flex;
  width: 334px;
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
  margin-right: -12px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 28px;
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
  height: 80px;
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
  },
  crewmates: {
    keyField: 'i',
    icon: <CrewmateIcon />,
    title: 'Crewmates',
    useColumns: listConfigs.crewmates,
  },
  crews: {
    keyField: 'i',
    icon: <CrewIcon />,
    title: 'Crews',
    useColumns: listConfigs.asteroids,
  },
  buildings: {
    keyField: 'i',
    icon: <BuildingIcon />,
    title: 'Buildings',
    useColumns: listConfigs.asteroids,
  },
  coreSamples: {
    // keyField: 'i',
    icon: <CoreSampleIcon />,
    title: 'Core Samples',
    useColumns: listConfigs.coreSamples,
  },
  ships: {
    keyField: 'i',
    icon: <ShipIcon />,
    title: 'Ships',
    useColumns: listConfigs.asteroids,
  },
  marketOrders: {
    keyField: 'i',
    icon: <RocketIcon />, // TODO
    title: 'Market Orders',
    useColumns: listConfigs.asteroids,
  },
  leases: {
    keyField: 'i',
    icon: <RocketIcon />, // TODO
    title: 'Leases',
    useColumns: listConfigs.asteroids,
  },
  actions: {
    keyField: 'i',
    icon: <RocketIcon />, // TODO
    title: 'Actions',
    useColumns: listConfigs.asteroids,
  },
  transactions: {
    keyField: 'i',
    icon: <TransactionIcon />,
    title: 'Transactions',
    useColumns: listConfigs.asteroids,
  },
}

const assetsAsOptions = Object.keys(assetTypes).map((key) => ({
  value: key,
  label: assetTypes[key].title,
  icon: assetTypes[key].icon
}));

const ListViewComponent = ({ assetType, onAssetTypeChange }) => {
  const { keyField, title, useColumns, filters, filterTray } = assetTypes[assetType];
  const { query, page, perPage, setPage, sort, setSort } = usePagedAssets(assetType);
  const [sortField, sortDirection] = sort;

  const columns = useColumns();

  const [disabledColumns, setDisabledColumns] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState();

  const onToggleColumns = useCallback((col) => () => {
    setDisabledColumns((colKeys) => {
      if (colKeys.find((k) => k === col.key)) {
        return colKeys.filter((k) => k !== col.key);
      }
      return [...colKeys, col.key];
    });
  }, []);

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
    return columns.filter((c) => !disabledColumns.includes(c.key));
  }, [columns, disabledColumns]);

  const hideableColumns = useMemo(() => {
    return columns.filter((c) => !c.unhideable);
  }, [columns]);

  const enabledColumnKeys = useMemo(() => enabledColumns.map((c) => c.key), [enabledColumns]);

  return (
    <Details fullWidth title="List View" contentProps={{ hasFooter: true }}>
      <ReactTooltip id="listView" effect="solid" />
      <Wrapper>
        <Controls>
          <LeftControls filtersOpen={filtersOpen}>
            <Dropdown
              initialSelection={assetType}
              onChange={onAssetTypeChange}
              options={assetsAsOptions}
              size="medium"
              width={272} />
            <div style={{ marginLeft: 6 }}>
              <Button
                data-for="global"
                data-place="right"
                data-tip={filtersOpen ? 'Hide Filters' : 'Show Filters'}
                background={filtersOpen ? 'transparent' : undefined}
                subtle={!filtersOpen || undefined}
                borderless={filtersOpen ? 'transparent' : undefined}
                onClick={onToggleFilters}
                size="bigicon">
                <SlidersIcon />
              </Button>
            </div>
          </LeftControls>
          <div style={{ flex: 1 }} />
          <Multiselect
            enabledKeys={enabledColumnKeys}
            buttonIcon={<ColumnsIcon />}
            buttonLabel="Columns"
            onChange={onToggleColumns}
            options={hideableColumns}
            size="medium"
            width={175}
          />
        </Controls>

        <MainWrapper>
          <FilterContainer open={filtersOpen}>
            <InnerFilterContainer>
              <SearchFilters assetType={assetType} />
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
          <div style={{ display: 'flex' }}>
            <SearchFilterTray assetType={assetType} handleClickFilters={onClickFilters} />
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

const ListView = () => {
  const { assetType } = useParams();
  const history = useHistory();

  const onAssetTypeChange = useCallback(({ value }) => {
    history.push(`/listview/${value}`);
  }, []);

  useEffect(() => {
    if (!assetType) history.push('/listview/asteroids');
    else if (!assetTypes[assetType]) history.replace('/listview/asteroids');
  }, [assetType]);

  if (!assetType) return null;
  // (NOTE: key forces remount so that doesn't complain about hook order changing due to useColumns)
  return <ListViewComponent key={assetType} assetType={assetType} onAssetTypeChange={onAssetTypeChange} />;
};

export default ListView;
