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
import PageLoader from '~/components/PageLoader';
import useReferrals from '~/hooks/useReferrals';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import { reactBool } from '~/lib/utils';


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

const ZeroReferrals = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  & > svg {
    font-size: 150px;
    margin-top: -80px;
    margin-bottom: 20px;
  }
  ${Banner} {
    flex-direction: column;
    height: auto;
    padding: 25px 80px;
    text-align: center;

    & > h3 {
      margin: 0;
      text-transform: uppercase;
    }
    & > p {
      color: ${p => p.theme.colors.main};
      margin: 15px 0 20px;
      & > b {
        color: white;
        font-weight: normal;
      }
    }
    & > button {
      width: 250px;
    }
    
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
const PossiblyPendingCell = styled(IconCell)`
  color: white;
  font-weight: bold;
  ${p => p.pending && `
    color: inherit;
    filter: saturate(0);
    &:after {
      content: "(Pending)";
      margin-left: 4px;
    }
  `}
`;

const LinkWrapper = styled.span`
  & span {
    color: inherit;
    text-decoration: none;
    &:hover {
      color: white;
      text-decoration: underline;
    }
  }
`;

const columns = [
  {
    key: 'createdAt',
    sortField: 'createdAt',
    label: 'Timestamp',
    selector: row => (new moment(new Date(1000 * (row.createdAt || 0)))).fromNow(),
  },
  {
    key: 'buyer',
    sortField: 'buyer',
    label: 'Referred Account',
    selector: row => (
      <LinkWrapper>
        <AddressLink address={row.buyer} truncate />
      </LinkWrapper>
    )
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
      <PossiblyPendingCell pending={reactBool(!row.processed)}>
        <SwayIcon />
        {((row.price || 0) * 0.1).toLocaleString()}
      </PossiblyPendingCell>
    )
  }
];

const RewardReferrals = () => {
  const { accountAddress, login } = useSession();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { data: referrals, isLoading } = useReferrals();

  const [sort, setSort] = useState(['createdAt', 'asc']);

  const handleCopyLink = useCallback(() => {
    if (!accountAddress) return login();

    navigator.clipboard.writeText(`${document.location.origin}/play?r=${accountAddress}`);
    createAlert({
      type: 'ClipboardAlert',
      data: { content: 'Recruitment link copied to clipboard.' },
      duration: 5000
    });
  }, [accountAddress, createAlert, login]);

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
    return (referrals || []).map((r) => ({
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

      {isLoading && <PageLoader />}
      {!isLoading && !(referrals?.length > 0) && (
        <ZeroReferrals>
          <SwayIcon />
          <Banner>
            <h3>Refer Friends &amp; Earn Sway</h3>
            <p>Receive SWAY equal to <b>10%</b> of any crewmate or asteroid purchases<br/>made from Influence through your referral link.</p>
            <Button onClick={handleCopyLink}>
              <LinkIcon /> <span>Copy Referral Link</span>
            </Button>
          </Banner>
        </ZeroReferrals>
      )}
      {!isLoading && referrals?.length > 0 && (
        <>
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
        </>
      )}
    </Wrapper>
  );
};

export default RewardReferrals;