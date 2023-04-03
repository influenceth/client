import { useEffect } from 'react';
import styled from 'styled-components';
import { ReactNotifications, Store as notify } from 'react-notifications-component';
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
    notify.addNotification(mergedOptions);
  } catch (e) {
    console.error(e);
  }
};

const StyledReactNotification = styled(ReactNotifications)`
  & .rnc__notification-container--top-center {
    top: 0 !important;
  }

  & .rnc__notification {
    width: 370px !important;
  }

  & .rnc__notification-item {
    background-color: ${p => p.theme.colors.contentBackdrop};
    border-color: ${p => p.theme.colors.main};
    border-radius: 0;
    border-width: 5px;
    cursor: ${p => p.theme.cursors.active};
  }

  & .rnc__notification-item.rnc__notification-item--warning {
    border-color: ${p => p.theme.colors.error};
  }

  & .rnc__notification-close-mark {
    background-color: transparent !important;
  }

  & .rnc__notification-close-mark:after {
    font-size: 20px !important;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    & .rnc__notification-item {
      background-color: black;
    }
  }
}
`;

const Alerts = (props) => {
  const alerts = useStore(s => s.logs.alerts);
  const notifyAlert = useStore(s => s.dispatchAlertNotified);
  const playSound = useStore(s => s.dispatchSoundRequested);

  useEffect(() => {
    if (alerts?.length === 0) return;
    alerts.filter(a => !a.notified).forEach(a => {
      const { level, type, duration, hideCloseIcon, onRemoval, ...data } = a;
      const options = level ? { type: level } : {};
      if (duration) options.dismiss = { duration: duration };
      if (hideCloseIcon) {
        options.dismiss = {
          ...(options.dismiss || defaults.dismiss),
          showIcon: false
        };
      }
      if (onRemoval) options.onRemoval = onRemoval;
      send(<LogEntry type={type} data={data} />, options);

      if (level === 'warning') {
        playSound('effects.failure');
      } else {
        playSound('effects.success');
      }

      notifyAlert(a);
    });
  }, [ alerts, notifyAlert, playSound ]);

  return (
    <StyledReactNotification />
  );
}

export default Alerts;
