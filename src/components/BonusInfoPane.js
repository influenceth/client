import styled from 'styled-components';

import MouseoverInfoPane from './MouseoverInfoPane';
import BonusBar from './BonusBar';

const TooltipContents = styled.div`
  font-size: 14px;
  padding-bottom: 10px;
  & > h3 {
    margin: 0 0 7px;
  }
  & > article {
    border-top: 1px solid ${p => p.theme.colors.borderBottom};
    color: #999;
    padding: 7px 14px 14px 0;
    display: flex;
    flex-direction: row;
  }
  & > div {
    display: flex;
    flex-direction: row;
    font-weight: bold;
    line-height: 1.6em;
    & > span:first-child {
      margin-right: 15px;
    }
  }
`;

const BonusInfoPane = ({ referenceEl, visible }) => (
  <MouseoverInfoPane css={{ width: '400px' }} referenceEl={referenceEl} visible={visible}>
    <TooltipContents>
      <h3>Bonuses</h3>
      <article>
        Asteroid bonuses have a chance of being discovered on any asteroid as it is scanned. They
        apply to resources when they are extracted, and are not part of an asteroid's composition.
      </article>

      <div>
        <span><BonusBar bonus={1} /></span>
        <span>Tier 1: Small Bonus. Common probability.</span>
      </div>
      <div>
        <span><BonusBar bonus={2} /></span>
        <span>Tier 2: Medium Bonus. Rare probability.</span>
      </div>
      <div>
        <span><BonusBar bonus={3} /></span>
        <span>Tier 3: Large Bonus. Exceptionally rare.</span>
      </div>
    </TooltipContents>
  </MouseoverInfoPane>
);

export default BonusInfoPane;