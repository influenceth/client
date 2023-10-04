import { useEffect } from 'react';
import styled from 'styled-components';
import { ReactNotifications, Store as notify } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import 'animate.css';

import { LinkIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import getAlertContent from '~/lib/getAlertContent';

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

const AlertWrapper = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.mainText};
  display: flex;
  font-size: ${p => p.theme.fontSizes.mainText};
  margin: 12px 0;

  & > * {
    padding: 0 5px;
    &:first-child,
    &:last-child {
      padding: 0;
    }
  }
`;

const Icon = styled.div`
  color: ${p => p.theme.colors.main};
  flex: 0 0 26px;
  font-size: 130%;
  padding-left: 5px;
  padding-right: 5px;
`;

const Description = styled.div`
  flex: 1;
  & a {
    color: ${p => p.theme.colors.mainText};
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 150px;
    overflow: hidden;
    vertical-align: top;
    white-space: nowrap;
  }
`;

const TransactionLink = styled.a`
  flex: 0 0 28px;
  font-size: 116%;
  height: 20px;
  margin-left: auto;
  padding-left: 8px;
  text-align: center;

  & > svg {
    color: ${p => p.theme.colors.main};
  }

  &:hover {
    & > svg {
      color: white;
    }
  }
`;

const Alerts = () => {
  const alerts = useStore(s => s.logs.alerts);
  const notifyAlert = useStore(s => s.dispatchAlertNotified);
  const playSound = useStore(s => s.dispatchSoundRequested);

  useEffect(() => {
    if (alerts?.length === 0) return;
    alerts.filter(a => !a.notified).forEach(a => {
      const { level, type, duration, hideCloseIcon, onRemoval, data } = a;
      const options = level ? { type: level } : {};
      if (duration) options.dismiss = { duration: duration };
      if (hideCloseIcon) {
        options.dismiss = {
          ...(options.dismiss || defaults.dismiss),
          showIcon: false
        };
      }
      if (onRemoval) options.onRemoval = onRemoval;

      const alertContent = getAlertContent({ type, data });
      if (alertContent) {
        const { icon, content, txLink } = alertContent;
        send(
          <AlertWrapper>
            <Icon>
              {icon}
            </Icon>
            <Description>
              {content}
            </Description>
            {txLink && (
              <TransactionLink href={txLink} rel="noreferrer" target="_blank">
                <LinkIcon />
              </TransactionLink>
            )}
          </AlertWrapper>,
          options
        );

        if (level === 'warning') {
          playSound('effects.failure');
        } else {
          playSound('effects.success');
        }
      }

      notifyAlert(a);
    });
  }, [ alerts, notifyAlert, playSound ]);

  return (
    <StyledReactNotification />
  );
}

export default Alerts;
