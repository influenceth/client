import { useMemo, useState } from 'react';
import styled from 'styled-components';
import Loader from 'react-spinners/PuffLoader';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import ClipCorner from '~/components/ClipCorner';
import LauncherDialog from './components/LauncherDialog';
import RecruitmentMenu from './components/RecruitmentMenu';
import NavIcon from '~/components/NavIcon';
import { CrewIcon } from '~/components/Icons';

const StyledNavIcon = styled(NavIcon).attrs((p) => ({
  color: p.theme.colors.darkMain,
  selected: true,
  selectedColor: p.theme.colors.darkMain,
  size: 20,
  background: 'black'
}))`
  position: absolute;
  bottom: -10px;
  left: 50%;
  margin-left: -14px;
`;  

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 20px 20px 0;
`;
const RewardsTitle = styled.div`
  border-bottom: 1px solid #222;
  color: #888;
  padding: 5px 0 15px;
  text-align: center;
  & > b {
    color: white;
    font-weight: normal;
  }
`;
const RewardsWrapperOuter = styled.div`
  flex: 1;
  overflow: hidden auto;
  padding: 25px 5px;
  & > label {
    color: #ccc;
    display: block;
    font-size: 15px;
    padding: 0 0 25px;
    text-align: center;
    & > a {
      color: ${p => p.theme.colors.main};
      transition: color 150ms ease;
      &:hover {
        color: ${p => p.theme.colors.brightMain};
      }
    }
  }
`;
const RewardsWrapper = styled.div`
  display: grid;
  gap: ${p => p.gap || 20}px;
  grid-template-columns: repeat(auto-fit, minmax(${p => p.widthTarget || 250}px, 1fr));
`;
const LoadingWrapper = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  width: 100%;
`;

const ErrorWrapper = styled(LoadingWrapper)``;

const rewardMenuCornerSize = 18;
const RewardBoxWrapper = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
  border: 1px solid ${p => p.theme.colors.darkMain};
  ${p => p.theme.clipCorner(rewardMenuCornerSize)};
  cursor: ${p => p.theme.cursors.active};
  position: relative;
  transition: background 150ms ease, border-color 150ms ease;
  width: 100%;

  & > svg:last-child {
    transition: color 150ms ease;
    color: ${p => p.theme.colors.darkMain};
  }
`;
const RewardBoxOuterWrapper = styled.div`
  position: relative;
  width: 100%;

  &:hover {
    & > ${RewardBoxWrapper} {
      background: rgba(${p => p.theme.colors.mainRGB}, 0.25);
      border-color: ${p => p.theme.colors.main};
      & > svg:last-child {
        color: ${p => p.theme.colors.main};
      }
    }
    & > ${StyledNavIcon} {
      & rect:first-child {
        stroke: ${p => p.theme.colors.main};
      }
      & rect:last-child {
        fill: white;
      }
    }
  }
`;

const RewardBox = ({ children }) => {
  return (
    <RewardBoxOuterWrapper>
      <RewardBoxWrapper>
        {children}
        <ClipCorner dimension={rewardMenuCornerSize} />
      </RewardBoxWrapper>
      <StyledNavIcon />
    </RewardBoxOuterWrapper>
  )
};

const missions = [
  {id: 1, title: 'Base Camp'},
  {id: 2, title: 'Romulus, Remus, and the Rest'},
  {id: 3, title: 'Learn By Doing'},
  {id: 4, title: 'Four Pillars'},
  {id: 5, title: 'Together, We Can Rise'},
  {id: 6, title: 'The Fleet'},
];

const MissionWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 400px;
  padding: 0 8px;
  position: relative;
  & > div:first-child {
    flex: 1;
  }
  & > h3 {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.5);
    color: white;
    font-size: 110%;
    font-weight: normal;
    margin: 0;
    padding: 5px 50px;
    text-align: center;
    text-transform: uppercase;
    width: 100%;
  }
  & > div:last-child {
    display: flex;
    flex: 2;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px 20px 25px;
    & > div {
      text-align: center;
      & > h6 {
        color: #555;
        font-size: 14px;
        margin: 0 0 4px;
        text-transform: uppercase;
      }
      & > span {
        color: #ccc;
        font-size: 13px;
      }
    }
    & > hr {
      border-color: rgba(255, 255, 255, 0.05);
      width: 100%;
    }
  }

  &:before {
    background: url(${p => p.bg}) no-repeat;
    background-position: top center;
    background-size: cover;
    content: '';
    display: block;
    height: 33%;
    left: 0;
    mask-image: linear-gradient(to bottom, black 0%, black 40%, transparent 100%);
    position: absolute;
    top: 0;
    width: 100%;
  }
`;
const Mission = ({ mission }) => {
  return (
    <RewardBox>
      <MissionWrapper bg={AsteroidsHeroImage}>
        <div></div>
        <h3>{mission.title}</h3>
        <div>
          <div>
            <h6>Objective</h6>
            <span>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span>
          </div>
          <hr/>
          <div>
            <h6>Community Goal</h6>
            <span>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.</span>
          </div>
          <hr/>
          <div>
            <h6>Ends At</h6>
            <span>Lorem ipsum dolor sit amet.</span>
          </div>
        </div>
      </MissionWrapper>
    </RewardBox>
  );
};
const CommunityMissions = () => {
  const [comingSoon, setComingSoon] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState();
  return (
    <Wrapper>
      <RewardsTitle>Powered By <b>Wendash</b></RewardsTitle>
      <RewardsWrapperOuter>
        {comingSoon && <ErrorWrapper>Coming soon.</ErrorWrapper>}
        {!comingSoon && error && <ErrorWrapper>Something went wrong. Please try again.</ErrorWrapper>}
        {!comingSoon && !error && loading && <LoadingWrapper><Loader color="white" size="60px" /></LoadingWrapper>}
        {!comingSoon && !error && !loading && (
          <>
            <label>
              Players work together towards these massively social milestones.
              View your completion status on <a href="https://influence.wendash.com/" target="_blank" rel="noopener noreferrer">Wendash</a>.
            </label>
            <RewardsWrapper>
              {missions.map((mission) => <Mission key={mission.id} mission={mission} />)}
            </RewardsWrapper>
          </>
        )}
      </RewardsWrapperOuter>
    </Wrapper>
  );
};


const QuestWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 300px;
  padding: 0 8px;
  position: relative;
  & > div {
    flex: 1;
    &:first-child {
      flex: 3;
    }
    &:nth-child(2) {
      font-size: 45px;
    }
    &:last-child {
      color: ${p => p.theme.colors.main};
      font-size: 15px;
    }
  }

  &:before {
    background: url(${p => p.bg}) no-repeat;
    background-position: top center;
    background-size: cover;
    content: '';
    display: block;
    height: 75%;
    left: 0;
    mask-image: linear-gradient(to bottom, black 0%, black 40%, transparent 100%);
    position: absolute;
    top: 0;
    width: 100%;
  }
`;

const Quest = () => {
  return (
    <RewardBox>
      <QuestWrapper bg={AsteroidsHeroImage}>
        <div></div>
        <div><CrewIcon /></div>
        <div>Lorem ipsum dolor sit amet.</div>
      </QuestWrapper>
    </RewardBox>
  );
}

const quests = [
  {id: 1, title: 'Base Camp'},
  {id: 2, title: 'Romulus, Remus, and the Rest'},
  {id: 3, title: 'Learn By Doing'},
  {id: 4, title: 'Four Pillars'},
  {id: 5, title: 'Together, We Can Rise'},
  {id: 6, title: 'The Fleet'},
];

const SocialQuests = () => {
  const [comingSoon, setComingSoon] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState();
  return (
    <Wrapper>
      <RewardsTitle>Powered By <b>Starknet Quest</b></RewardsTitle>
      <RewardsWrapperOuter>
        {comingSoon && <ErrorWrapper>Coming soon.</ErrorWrapper>}
        {!comingSoon && error && <ErrorWrapper>Something went wrong. Please try again.</ErrorWrapper>}
        {!comingSoon && !error && loading && <LoadingWrapper><Loader color="white" size="60px" /></LoadingWrapper>}
        {!comingSoon && !error && !loading && (
          <>
            <label>
              Individual quests. View quest status on <a href="https://starknet.quest/" target="_blank">Starknet Quest</a>.
            </label>
            <RewardsWrapper gap={30} widthTarget={200}>
              {quests.map((quest) => <Quest key={quest.id} quest={quest} />)}
            </RewardsWrapper>
          </>
        )}
      </RewardsWrapperOuter>
    </Wrapper>
  );
};

const panes = [
  {
    label: 'Community Missions',
    pane: <CommunityMissions />
  },
  {
    label: 'Social Quests',
    pane: <SocialQuests />
  }
];

const Rewards = () => (
  <LauncherDialog
    bottomLeftMenu={<RecruitmentMenu />}
    panes={panes} />
);

export default Rewards;