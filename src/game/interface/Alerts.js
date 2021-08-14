import { useEffect } from 'react';
import styled from 'styled-components';
import ReactNotification, { store as notify } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import 'animate.css';

import useStore from '~/hooks/useStore';
import LogEntry from '~/components/LogEntry';

const defaults = {
  type: 'info',
  insert: 'top',
  container: 'top-center',
  dismiss: { duration: 0, pauseOnHover: true, onScreen: true, showIcon: true },
  animationIn: ['animate__animated animate__fadeIn'],
  animationOut: ['animate__animated animate__fadeOut']
};

/**
 * Sends a notification and requires only a message (additional options can be provided)
 * @param message A string message to display in the notification
 * @param options An object specifcying default overrides or additional options
 */
const send = (message, options = {}) => {
  try {
    options.message = message;
    const mergedOptions = Object.assign({}, JSON.parse(JSON.stringify(defaults)), options);
    if (mergedOptions.type === 'info') mergedOptions.dismiss.duration = 5000;
    notify.addNotification(mergedOptions);
  } catch (e) {
    console.error(e);
  }
};

const StyledReactNotification = styled(ReactNotification)`
  & .notification__item {
    background-color: ${p => p.theme.colors.contentBackdrop};
    border-color: ${p => p.theme.colors.main};
    border-radius: 0;
    cursor: ${p => p.theme.cursors.active};
  }
`;

const Alerts = (props) => {
  const alerts = useStore(s => s.logs.alerts);
  const notifyAlert = useStore(s => s.dispatchAlertNotified);

  useEffect(() => {
    if (alerts?.length === 0) return;
    alerts.filter(a => !a.notified).forEach(a => {
      send(<LogEntry type="Asteroid_NamingError" data={a} />);
      notifyAlert(a);
    });
  }, [ alerts, notifyAlert ]);

  return (
    <StyledReactNotification />
  );
}

export default Alerts;
