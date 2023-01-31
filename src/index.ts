import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { WinkerHomebridgePlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
module.exports = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, WinkerHomebridgePlatform);
};
