import TagManager from 'react-gtm-module';

import { appConfig } from '~/appConfig';

export const initializeTagManager = () => {
  if (appConfig.get('Api.ClientId.gtm')) TagManager.initialize({ gtmId: appConfig.get('Api.ClientId.gtm') });
};