import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled from 'styled-components';
import utils from 'influence-utils';
import { utils as ethersUtils } from 'ethers';
import { MdFlag, MdBlurOff } from 'react-icons/md';
import { AiFillEdit } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import useAsteroidPrice from '~/hooks/useAsteroidPrice';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import Details from '~/components/Details';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import BonusBadge from '~/components/BonusBadge';
import DataReadout from '~/components/DataReadout';

const StyledAsteroidDetails = styled.div`
  align-items: stretch;
  display: flex;
  height: 100%;

  & div {
    border: 1px solid red;
  }
`;

const SidePanel = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 300px;
`;

const StyledButton = styled(Button)`
  margin-bottom: 10px;
`;

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const Resources = styled.div`
  display: flex;
  flex: 1 1 50%;
`;

const ResourceMix = styled.div`
  flex: 1 1 33%;
`;

const Bonuses = styled.div`
  flex: 1 1 67%;
`;

const Dimensions = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 50%;
`;

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const history = useHistory();
  const [ previousOrigin, setPreviousOrigin ] = useState(null);
  const asteroid = useStore(state => state.origin);
  const sale = useSale();
  const asteroidPrice = useAsteroidPrice(i);
  const buyAsteroid = useBuyAsteroid();
  const selectOrigin = useStore(state => state.selectOrigin);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    selectOrigin(i);
  }, [ selectOrigin ]);

  // Checks for a origin -> null transition to close the view
  useEffect(() => {
    if (previousOrigin && !asteroid) history.push('/');
    setPreviousOrigin(asteroid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroid ]);

  return (
    <Details
      title={`${asteroid?.name} Details`}>
      <StyledAsteroidDetails>
        <SidePanel>
          {sale && (
            <DataReadout label="Price" data={
              asteroidPrice.data ? `${ethersUtils.formatEther(asteroidPrice?.data)} ETH` : '... ETH'
            } />
          )}
          {sale && (
            <StyledButton
              data-tip="Purchase development rights"
              data-for="global"
              disabled={!asteroidPrice.data}
              onClick={() => buyAsteroid.mutate(asteroid.i)}>
              <MdFlag /> Purchase
            </StyledButton>
          )}
          <StyledButton
            data-tip="Scan for resource bonuses"
            data-for="global">
            <MdBlurOff /> Scan
          </StyledButton>
          <StyledButton
            data-tip="Update asteroid name"
            data-for="global">
            <AiFillEdit /> Name
          </StyledButton>
        </SidePanel>
        <MainPanel>
          <Resources>
            <ResourceMix>
            </ResourceMix>
            <Bonuses>
            </Bonuses>
          </Resources>
          <Dimensions>
          </Dimensions>
        </MainPanel>
      </StyledAsteroidDetails>
    </Details>
  );
};

export default AsteroidDetails;
