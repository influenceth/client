import LauncherDialog from './components/LauncherDialog';
import RecruitmentMenu from './components/RecruitmentMenu';
import RewardMissions from './components/RewardMissions';
import RewardQuests from './components/RewardQuests';
import RewardReferrals from './components/RewardReferrals';

const panes = [
  {
    label: 'Colonization Missions',
    pane: <RewardMissions mode="colonization" />
  },
  false && process.env.REACT_APP_COMMUNITY_MISSIONS_URL && {
    label: 'Community Missions',
    pane: <RewardMissions mode="community" />
  },
  process.env.REACT_APP_SOCIAL_QUESTS_URL && {
    label: 'Social Quests',
    pane: <RewardQuests />
  },
  {
    label: 'Referral Rewards',
    pane: <RewardReferrals />
  }
].filter((p) => !!p);

const Rewards = () => (
  <LauncherDialog
    bottomLeftMenu={<RecruitmentMenu />}
    panes={panes} />
);

export default Rewards;