import LauncherDialog from './components/LauncherDialog';

const panes = [
  {
    label: 'Social Quests',
    pane: <div />
  },
  {
    label: 'Community Missions',
    pane: <div />
  }
];

const Rewards = () => <LauncherDialog panes={panes} />;

export default Rewards;