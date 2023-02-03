import { AxiosError } from 'axios';
import { Logger, PlatformConfig } from 'homebridge';
import { WinkerHomebridgePlatform } from '../platform';
import { Device, LockState } from './Device';
import { Session } from './Session';
import { setupApi, ThrottleError, winkerApi } from './winkerApi';

export interface Config extends PlatformConfig {
  clientKey: string;
  portal: number;
  username: string;
  password: string;
}

export class Winker {
  public api = winkerApi;
  public session: Session;

  constructor(
    public readonly platform: WinkerHomebridgePlatform,
    public readonly config: Config,
    public readonly logger: Logger,
  ) {
    const { clientKey, portal, username, password } = config;
    this.session = new Session(username, password, clientKey, portal);

    setupApi(this.session, logger);
  }

  async getDevices() {
    const devices = await this.api.getDevices({
      queries: {
        id_portal: this.session.portal,
      },
    });
    return devices.map(
      (device) =>
        new Device(this.platform.api.hap.uuid.generate, device, 'door'),
    );
  }

  async setDeviceState(deviceId: string, hkState: LockState) {
    const state = hkState === LockState.UNSECURED ? 'OPEN' : 'CLOSED';
    this.logger.debug(`Upading remote state of ${deviceId} to ${state}`);
    return this.api.openDevice({
      id_portal: this.session.portal,
      device: {
        id_device: deviceId,
        state,
      },
    });
  }
}
