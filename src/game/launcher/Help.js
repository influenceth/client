import LauncherDialog from './components/LauncherDialog';

const panes = [
  {
    label: 'Tutorials',
    pane: <div />
  },
  {
    label: 'Community Content',
    pane: <div />
  },
  {
    label: 'Non-English Content',
    pane: <div />
  },
  {
    label: 'Game Wiki',
    pane: <div />
  }
];

const Help = () => <LauncherDialog panes={panes} />;

export default Help;