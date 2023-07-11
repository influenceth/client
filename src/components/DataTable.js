import styled from 'styled-components';
import { TriangleDownIcon, TriangleUpIcon } from './Icons';

import { itemColors } from '~/lib/actionItem';

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
    : `
      &:hover {
        td {
          background: rgba(${p.theme.colors.mainRGB}, 0.1);
        }
      }
    `
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
        min-width: ${minColumnWidth}px;  
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
  & > div {
    ${p => p.align && `justify-content: ${align[p.align]} !important;`}
    ${p => p.sorted && `background: rgba(255, 255, 255, 0.1);`}
    ${p => p.isIconColumn
      ? `
        padding: 0 !important;
        width: 100% !important;
      `
      : `
        min-width: ${minColumnWidth}px;  
      `
    }
  }
`;

const getEmptyObj = () => ({});
const DataTableComponent = ({
  columns,
  data,
  getRowProps = getEmptyObj,
  keyField,
  onClickColumn,
  sortField,
  sortDirection
}) => (
  <DataTable>
    <DataTableHead>
      <DataTableRow>
        {columns.map((c) => (
          <DataTableHeadCell
            key={c.key}
            align={c.align}
            isIconColumn={!c.label}
            onClick={onClickColumn(c.sortField)}
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
        <DataTableRow key={keyField ? row[keyField] : i} {...getRowProps(row)}>
          {columns.map((c) => (
            <DataTableCell
              key={c.key}
              align={c.align}
              isIconColumn={!c.label}
              sorted={sortField && sortField === c.sortField ? sortDirection : ''}
              style={c.bodyStyle || {}}>
              <div>
                {c.selector(row)}
              </div>
            </DataTableCell>
          ))}
        </DataTableRow>
      ))}
    </DataTableBody>
  </DataTable>
);

export default DataTableComponent;
