import { useCallback } from 'react';
import styled from 'styled-components';

import { ChevronDoubleRightIcon, InfluenceIcon, LinkIcon, SwayIcon } from '~/components/Icons';
import ClipCorner from '~/components/ClipCorner';
import Button from '~/components/ButtonAlt';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import useReferrals from '~/hooks/useReferrals';

const Wrapper = styled.div`
  padding: 0 16px;

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

const recruitMenuCornerSize = 18;
const RecruitmentBox = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
  border: 1px solid ${p => p.theme.colors.darkMain};
  ${p => p.theme.clipCorner(recruitMenuCornerSize)};
  margin-top: 20px;
  padding: 8px 8px 0;
  position: relative;

  & > h3 {
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: row;
    font-size: 14px;
    justify-content: space-between;
    margin: 0;
    padding: 2px 0 10px;
    text-transform: uppercase;
    width: 100%;
    & > svg {
      color: ${p => p.theme.colors.main};
      font-size: 10px;
    }
  }
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    padding: 20px 0 24px;
    
    color: #888;
    font-size: 12px;
    b {
      color: white;
      font-weight: normal;
    }
  }

  & > svg:last-child {
    color: ${p => p.theme.colors.darkMain};
  }
`;

const RecruitmentMenu = () => {
  const { data: referrals, isLoading } = useReferrals();
  const { accountAddress } = useSession();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [referralsCount, referralsTotal] = useMemo(() => {
    const referred = new Set();
    let total = 0;
    (referrals || []).forEach((r) => {
      referred.add(r.buyer)
      total += r.price * 0.1;
    });
    return [
      Array.from(referred).length,
      total
    ];
  }, [referrals]);

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(`${document.location.origin}/play?r=${accountAddress}`);
    createAlert({
      type: 'ClipboardAlert',
      data: { content: 'Recruitment link copied to clipboard.' },
      duration: 5000
    });
  }, [accountAddress, createAlert]);

  return (
    <Wrapper>
      {!isLoading && (
        <>
          <h3>Earned from <b>{(referralsCount || 0).toLocaleString()}</b> Referral{referralsCount === 1 ? '' : 's'}:</h3>
          <label><SwayIcon /> {(referralsTotal || 0).toLocaleString()}</label>
        </>
      )}
      <RecruitmentBox>
        <h3>
          <label>Recruitment Program</label>
          <ChevronDoubleRightIcon />
        </h3>
        <div>
          Earn SWAY for each friend who uses your referral link to purchase at least 1 crewmate.
        </div>
        <Button onClick={handleClick} size="small" style={{ marginBottom: 8, width: '100%' }}>
          <LinkIcon /> <span>Copy Referral Link</span>
        </Button>
        <ClipCorner dimension={recruitMenuCornerSize} />
      </RecruitmentBox>
    </Wrapper>
  );
};

export default RecruitmentMenu;