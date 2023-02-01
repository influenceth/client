import { useCallback, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Capable, Construction, CoreSample, Extraction, Inventory } from '@influenceth/sdk';

import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import ResourceColorIcon from '~/components/ResourceColorIcon';
import { formatFixed } from '~/lib/utils';
import { ExtractionIcon, ImproveCoreSampleIcon } from '~/components/Icons';
import { IconButtonRounded } from '~/components/ButtonRounded';
import ReactTooltip from 'react-tooltip';
import useStore from '~/hooks/useStore';
import theme from '~/theme';

const mouseoverCss = css`
  max-height: 300px;
  overflow: auto;
  padding: 12px;
  pointer-events: all;
  width: auto;
`;
const CoreSampleTable = styled.table`
  border-collapse: collapse;
  & tr {
    & > * {
      font-size: 14px;
      padding: 3px 8px;
      text-align: center;
      &:first-child {
        text-align: left;
      }
    }
  }
  & thead {
    font-weight: bold;
  }
  & tbody tr {
    cursor: ${p => p.theme.cursors.active};
    &:hover > td {
      background: rgba(255, 255, 255, 0.05);
    }
  }
`;

const StatusCell = styled.td`
  &:before {
    content: "${p => p.status}";
    ${p => {
      if (p.status === 'Sampling') {
        return `color: rgba(${p.theme.colors.mainRGB}, 0.5);`;
      } else if (p.status === 'Ready') {
        return `color: ${p.theme.colors.main};`;
      } else if (p.status === 'Utilized') {
        return `color: rgb(248, 133, 44);`;
      } else if (p.status === 'Depleted') {
        return `color: #777;`;
      }
    }}
    text-transform: uppercase;
  }
`;

const CoreSampleMouseover = ({ building, children, coreSamples }) => {
  const setAction = useStore(s => s.dispatchActionDialog);

  const [open, setOpen] = useState();
  const refEl = useRef();

  // NOTE: because we actually hide the contents on close, the popper is placed as
  //  if the contents width is 0 (and so is placed top-left instead of top-center)

  // TODO (later): add abundance or max yield?

  const onClickExtract = useCallback((sample) => () => {
    setAction('EXTRACT_RESOURCE', { preselect: { ...sample } });
    setOpen(false);
  }, [setAction]);

  const onClickImprove = useCallback((sample) => () => {
    setAction('IMPROVE_CORE_SAMPLE', { preselect: { ...sample } });
    setOpen(false);
  }, [setAction]);

  const onToggle = useCallback((e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  });

  return (
    <>
      <MouseoverInfoPane css={mouseoverCss} referenceEl={refEl.current} visible={open}>
        <ReactTooltip id="coreSampleMouseover" effect="solid" />
        <CoreSampleTable
          style={open ? {} : { display: 'none' }}
          onClick={(e) => { e.stopPropagation(); return false; }}
          onMouseLeave={() => setOpen(false)}>
          <thead>
            <tr>
              <th>Core Samples</th>
              <td>Deposit Yield</td>
              <td>Remaining</td>
              <td>Status</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {coreSamples.map((cs) => {
              return (
                <tr key={`${cs.resourceId}_${cs.sampleId}`}>
                  <td>
                    <ResourceColorIcon category={Inventory.RESOURCES[cs.resourceId].category} />
                    {Inventory.RESOURCES[cs.resourceId].name} #{cs.sampleId.toLocaleString()}
                  </td>
                  <td>{formatFixed(cs.initialYield * 1e-3, 1)} tonnes</td>
                  <td>{(100 * cs.remainingYield / cs.initialYield).toFixed(1)}%</td>
                  <StatusCell status={
                    cs.status === CoreSample.STATUS_USED
                      ? (cs.remainingYield > 0 ? 'Utilized' : 'Depleted')
                      : (cs.status === CoreSample.STATUS_FINISHED ? 'Ready' : 'Sampling')
                  } />
                  <td>
                    <div style={{ display: 'flex'}}>
                      <IconButtonRounded
                        data-for="coreSampleMouseover"
                        data-place="left"
                        data-tip="Improve Sample"
                        disabled={cs.status !== CoreSample.STATUS_FINISHED}
                        onClick={onClickImprove(cs)}
                        style={{ padding: 4, marginRight: 4 }}>
                        <ImproveCoreSampleIcon />
                      </IconButtonRounded>
                      {Capable.TYPES[building?.capableType]?.name === 'Extractor'
                        && building?.construction?.status === Construction.STATUS_OPERATIONAL
                        && (
                          <IconButtonRounded
                            data-for="coreSampleMouseover"
                            data-place="left"
                            data-tip="Use for Extraction"
                            disabled={building.extraction?.status === Extraction.STATUS_EXTRACTING || cs.status < CoreSample.STATUS_FINISHED || cs.remainingYield === 0}
                            onClick={onClickExtract(cs)}
                            style={{ padding: 4 }}>
                            <ExtractionIcon />
                          </IconButtonRounded>
                        )
                      }
                    </div>
                  </td>
                </tr>
              );
            })}  
          </tbody>
        </CoreSampleTable>
      </MouseoverInfoPane>
      {children({ refEl, onToggle })}
    </>
  );
};

export default CoreSampleMouseover;
