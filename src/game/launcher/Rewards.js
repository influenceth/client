import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Entity } from '@influenceth/sdk';
import moment from 'moment';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import AddressLink from '~/components/AddressLink';
import Button from '~/components/ButtonAlt';
import DataTableComponent from '~/components/DataTable';
import EntityName from '~/components/EntityName';
import { CrewmateIcon, LinkIcon, PurchaseAsteroidIcon, SwayIcon } from '~/components/Icons';
import useReferralsCount from '~/hooks/useReferralsCount';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import LauncherDialog from './components/LauncherDialog';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 20px 20px 0;
  position: relative;
`;

const CoverImage = styled.div`
  height: 100%;
  opacity: 0.3;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  z-index: -1;
  &:before {
    background-color: #111;
    background-image: url(${AsteroidsHeroImage});
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    content: '';
    display: block;
    height: 100%;
    mask-image: linear-gradient(to bottom, black 75%, transparent 100%);
    transition: background-position 750ms ease-out;
  }
`;

const Banner = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid ${p => p.theme.colors.darkMain};
  display: flex;
  flex-direction: row;
  height: 130px;
  padding: 0 20px;
  & > svg {
    font-size: 92px;
    margin-right: 20px;
  }
  & > div:not(:last-child) {
    flex: 1;
    & > h3 {
      font-weight: normal;
      margin: 0 0 10px;
      text-transform: uppercase;
    }
    & > p {
      color: ${p => p.theme.colors.main};
      margin: 0;
      & > b {
        color: white;
        font-weight: normal;
      }
    }
  }
  & > div:last-child {
    flex: 0 0 250px;
  }
`;

const OuterTableWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  padding-top: 30px;
`;
const TableWrapper = styled.div`
  height: 100%;
  overflow: auto auto;
  & tr { height: 50px; }
  & thead tr > * {
    background: rgba(0, 0, 0, 0.75);
  }
  & tbody tr > * {
    background: transparent;
  }
`;
const IconCell = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  & > svg {
    font-size: 133%;
  }
`;

const ref1 = `0x0123456789abcdef9eed98e63520641e4c72521ec64b73e90123456789abcded`;
const ref2 = `0x0123456789abcdef9eed98e63520641e4c72521ec64b73e90123456789abcdee`;
const ref3 = `0x0123456789abcdef9eed98e63520641e4c72521ec64b73e90123456789abcdef`;
const referrals = [
  { entity: { label: 3, id: 123 }, referrer: ref1, earnings: 123, createdAt: 1716996392 },
  { entity: { label: 3, id: 123444 }, referrer: ref1, earnings: 1000, createdAt: 1716997392 },
  { entity: { label: 2, id: 123 }, referrer: ref1, earnings: 1293, createdAt: 1716992392 },
  { entity: { label: 2, id: 124 }, referrer: ref2, earnings: 1323, createdAt: 1716992392 },
  { entity: { label: 2, id: 125 }, referrer: ref3, earnings: 12223, createdAt: 1716994392 },
  { entity: { label: 2, id: 126 }, referrer: ref3, earnings: 1223, createdAt: 1716995392 },
  { entity: { label: 2, id: 127 }, referrer: ref3, earnings: 12883, createdAt: 1716986392 },
  { entity: { label: 2, id: 128 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  { entity: { label: 2, id: 129 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  { entity: { label: 2, id: 130 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  { entity: { label: 2, id: 131 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  { entity: { label: 2, id: 132 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  { entity: { label: 2, id: 133 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  { entity: { label: 2, id: 134 }, referrer: ref3, earnings: 2300, createdAt: 1716989392 },
  
];

const columns = [
  {
    key: 'createdAt',
    sortField: 'createdAt',
    label: 'Timestamp',
    selector: row => (new moment(new Date(1000 * (row.createdAt || 0)))).fromNow(),
  },
  {
    key: 'referrer',
    sortField: 'referrer',
    label: 'Referred Account',
    selector: row => <AddressLink address={row.referrer} truncate style={{ color: 'inherit', textDecoration: 'none' }} />
  },
  {
    key: 'uuid',
    label: 'Purchase',
    selector: row => (
      <IconCell>
        {row.entity.label === Entity.IDS.ASTEROID && <PurchaseAsteroidIcon />}
        {row.entity.label === Entity.IDS.CREWMATE && <CrewmateIcon />}
        <div style={{ width: 4 }} />
        <EntityName label={row.entity.label} id={row.entity.id} />
      </IconCell>
    )
  },
  {
    key: 'earnings',
    sortField: 'earnings',
    label: 'Amount Earned (10%)',
    align: 'right',
    selector: row => (
      <IconCell style={{ fontWeight: 'bold' }}>
        <SwayIcon />
        {(row.earnings || 0).toLocaleString()}
      </IconCell>
    )
  }
];


const ReferralRewards = () => {
  const { accountAddress } = useSession();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [sort, setSort] = useState(['createdAt', 'asc']);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${document.location.origin}/play?r=${accountAddress}`);
    createAlert({
      type: 'ClipboardAlert',
      data: { content: 'Recruitment link copied to clipboard.' },
      duration: 5000
    });
  }, [accountAddress, createAlert]);

  const handleSort = useCallback((field) => () => {
    if (!field) return;

    let updatedSortField = sort[0];
    let updatedSortDirection = sort[1];
    if (field === sort[0]) {
      updatedSortDirection = sort[1] === 'desc' ? 'asc' : 'desc';
    } else {
      updatedSortField = field;
      updatedSortDirection = 'desc';
    }

    setSort([updatedSortField, updatedSortDirection]);
  }, [sort]);

  const transformedData = useMemo(() => {
    return referrals.map((r) => ({
      uuid: Entity.packEntity(r.entity),
      ...r
    }))
  }, [referrals]);

  const filteredData = useMemo(() => {
    return transformedData.sort((a, b) => {
      return (sort[1] === 'asc' ? -1 : 1) * (a[sort[0]] < b[sort[0]] ? -1 : 1);
    });
  }, [sort, transformedData]);

  return (
    <Wrapper>
      <CoverImage />
      <Banner>
        <SwayIcon />
        <div>
          <h3>Refer Friends &amp; Earn Sway</h3>
          <p>Receive SWAY equal to <b>10%</b> of any crewmate or asteroid purchases<br/>made from Influence through your referral link.</p>
        </div>
        <div>
          <Button onClick={handleCopyLink} style={{ width: '100%' }}>
            <LinkIcon /> <span>Copy Referral Link</span>
          </Button>
        </div>
      </Banner>
      <OuterTableWrapper>
        <TableWrapper>
          <DataTableComponent
            columns={columns}
            data={filteredData}
            keyField="uuid"
            onClickColumn={handleSort}
            sortDirection={sort[1]}
            sortField={sort[0]}
          />
        </TableWrapper>
      </OuterTableWrapper>
    </Wrapper>
  );
};

const EarningsWrapper = styled.div`
  padding: 0 16px 12px;

  & > h3 {
    color: #888;
    font-size: 15px;
    font-weight: normal;
    margin-bottom: 8px;
    & > b {
      color: white;
      font-weight: normal;
    }
  }
  & > label {
    font-size: 32px;
    line-height: 32px;
  }
`;

const ReferralEarningsMenu = () => {
  const { data: referralsCount, isLoading } = useReferralsCount();
  return (
    <EarningsWrapper>
      {!isLoading && (
        <>
          <h3>Earned from <b>{(referralsCount || 0).toLocaleString()}</b> Referral{referralsCount === 1 ? '' : 's'}:</h3>
          <label><SwayIcon /> {((referralsCount || 0) * 1000).toLocaleString()}</label>
        </>
      )}
    </EarningsWrapper>
  );
};

const panes = [
  {
    label: 'Referral Rewards',
    pane: <ReferralRewards />
  }
];

const Rewards = () => (
  <LauncherDialog
    bottomLeftMenu={<ReferralEarningsMenu />}
    panes={panes} />
);

export default Rewards;