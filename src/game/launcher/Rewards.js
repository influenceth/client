import appConfig from '~/appConfig';
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
  false && appConfig.get('Url.communityMissions') && {
    label: 'Community Missions',
    pane: <RewardMissions mode="community" />
  },
  appConfig.get('Url.socialQuests') && {
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