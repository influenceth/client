import styled from 'styled-components';
import { TriangleDownIcon, TriangleUpIcon } from './Icons';

import { itemColors } from '~/lib/actionItem';
import { useCallback, useMemo, useState } from 'react';
import { reactBool } from '~/lib/utils';

const minColumnWidth = 190;

const align = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end'
};

const DataTable = styled.table.attrs({
  cellSpacing: 0,
  cellPadding: 0
})`
  border-collapse: collapse;
  width: calc(100% - 18px);
  td, th {
    background: black;
    color: #AAA;
    & > div {
      align-items: center;
      justify-content: flex-start;
      display: flex;
      height: 100%;
      padding: 0 16px;
      position: relative;
      white-space: nowrap;
      width: 100%;
    }
  }
  td {
    font-size: 15px;
  }
`;
const DataTableHead = styled.thead``;
const DataTableBody = styled.tbody``;
const DataTableRow = styled.tr`
  ${p => p.onClick && `cursor: ${p.theme.cursors.active};`}
  ${p => p.status
    ? `
      td {
        background: rgba(${itemColors[p.status]}, 0.12);
        i {
          color: rgb(${itemColors[p.status]});
        }
      }
      &:hover {
        td {
          background: rgba(${itemColors[p.status]}, 0.16);
        }
      }
    `
    : (
      p.isSelected
        ? `
          td {
            background: rgba(${p.selectedColorRGB || p.theme.colors.mainRGB}, 0.3);
          }
        `
        : `
          &:hover {
            td {
              background: rgba(${p.selectedColorRGB || p.theme.colors.mainRGB}, 0.1);
            }
          }
        `
    )
  }
`;

const SortIcon = styled.span`
  font-size: 14px;
  position: absolute;
  right: 6px;
  transition: opacity 250ms ease, transform 250ms ease;
`;

const iconColumnWidth = 45;
const DataTableHeadCell = styled.th`
  height: 40px;
  ${p => p.isIconColumn && `width: ${iconColumnWidth}px;`}
  position: sticky;
  top: 0;
  z-index: 1;
  & > div {
    ${p => p.align && `justify-content: ${align[p.align]} !important;`}
    background: transparent;
    border-bottom: 1px solid #444;
    ${p => p.isIconColumn
      ? `
        color: #444;
        padding: 0 !important;
        width: ${iconColumnWidth}px !important;
      `
      : `
        min-width: ${p.noMinWidth ? 0 : minColumnWidth}px;
      `
    }

    ${p => p.sortable && `
      cursor: ${p.theme.cursors.active};
      ${p.sorted && `
        background: rgba(${p.theme.colors.mainRGB}, 0.5);
        color: white;
      `}
      ${SortIcon} {
        opacity: ${p.sorted ? 1 : 0};
      }

      &:hover {
        ${SortIcon} {
          ${p.sorted
            ? `
              opacity: 0.75;
              transform: rotate(180deg);
            `
            : `
              opacity: 0.5;
            `
          }
        }
      }
    `}

    & > svg {
      font-size: 24px;
      ${p => !p.isIconColumn && `margin-right: 6px;`}
    }
  }
`;
const DataTableCell = styled.td`
  border-bottom: 1px solid #171717;
  height: 40px;
  ${p => p.isIconColumn && `width: 45px;`}
  ${p => p.sorted && `color: white !important;`}
  ${p => p.expandableContent && `background: rgba(255, 255, 255, 0.15) !important;`}
  & > div {
    ${p => p.align && `justify-content: ${align[p.align]} !important;`}
    ${p => p.sorted && `background: rgba(255, 255, 255, 0.1);`}
    ${p => p.isIconColumn
      ? `
        padding: 0 !important;
        width: 100% !important;
      `
      : `
        min-width: ${p.noMinWidth ? 0 : minColumnWidth}px;
      `
    }
  }
`;
const CellInner = styled.div`
  ${p => p.wrap && `white-space: normal !important;`}
`;

const getEmptyObj = () => ({});

const ExpandableDataTableRow = ({ columns, getRowProps, row, sortDirection, sortField }) => {
  const [expanded, setExpanded] = useState(false);

  const expandableContent = useMemo(() => {
    const getContent = columns.find((c) => c.key === '_expandable')?.selector;
    if (getContent) return getContent(row);
    return null;
  }, [columns, row]);

  const onClickExpandable = useCallback(() => {
    if (expandableContent) setExpanded((e) => !e);
  }, [expandableContent]);

  const rowProps = useMemo(() => {
    return (getRowProps ? getRowProps(row) : null) || {};
  }, [getRowProps, row]);

  return (
    <>
      <DataTableRow
        {...rowProps}
        clickable={rowProps?.onClick || !!expandableContent}
        isSelected={reactBool(rowProps?.isSelected || expanded)}
        onClick={expandableContent ? onClickExpandable : rowProps?.onClick}>
        {columns.filter((c) => !c.skip).map((c) => (
          <DataTableCell
            key={c.key}
            align={c.alignBody || c.align}
            isIconColumn={c.isIconColumn || !c.label}
            noMinWidth={c.noMinWidth}
            sorted={sortField && sortField === c.sortField ? sortDirection : ''}
            style={c.bodyStyle || {}}>
            <CellInner wrap={reactBool(!!c.wrap)}>
              {c.selector(row, { expanded, ...rowProps })}
            </CellInner>
          </DataTableCell>
        ))}
      </DataTableRow>
      {expanded && expandableContent && (
        <DataTableRow isSelected>
          <DataTableCell expandableContent colSpan={columns.filter((c) => !c.skip).length}>
            {expandableContent}
          </DataTableCell>
        </DataTableRow>
      )}
    </>
  );
}

const DataTableComponent = ({
  columns,
  data,
  getRowProps = getEmptyObj,
  keyField,
  onClickColumn,
  sortField,
  sortDirection,
  sortOptions
}) => (
  <DataTable>
    <DataTableHead>
      <DataTableRow>
        {columns.filter((c) => !c.skip).map((c) => (
          <DataTableHeadCell
            key={c.key}
            align={c.alignHeader || c.align}
            isIconColumn={c.isIconColumn || !c.label}
            noMinWidth={c.noMinWidth}
            onClick={onClickColumn ? onClickColumn(c.sortField, c.sortOptions) : undefined}
            sortable={!!c.sortField}
            sorted={sortField && sortField === c.sortField ? sortDirection : ''}
            style={c.headStyle || {}}>
            <div>
              {c.sortField && (
                <SortIcon>
                  {sortField === c.sortField && sortDirection === 'asc'
                    ? <TriangleDownIcon />
                    : <TriangleUpIcon />
                  }
                </SortIcon>
              )}
              {c.label ? c.label : c.icon}
            </div>
          </DataTableHeadCell>
        ))}
      </DataTableRow>
    </DataTableHead>
    <DataTableBody>
      {(data || []).map((row, i) => (
        <ExpandableDataTableRow
          key={keyField ? row[keyField] : i}
          columns={columns}
          row={row}
          getRowProps={getRowProps}
          sortDirection={sortDirection}
          sortField={sortField} />
      ))}
    </DataTableBody>
  </DataTable>
);

export default DataTableComponent;
