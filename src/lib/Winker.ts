import { Logger, PlatformConfig } from 'homebridge';
import { WinkerHomebridgePlatform } from '../platform';
import { Device } from './Device';
import { Session } from './Session';
import { DEVICE_STATE, setupApi, winkerApi } from './winkerApi';

export interface Config extends PlatformConfig {
  clientKey: string;
  portal: number;
  username: string;
  password: string;
}

export const enum DEVICE_CONFIG_TYPE {
  STATELESS_DOOR = 'STATELESS_DOOR',
}

export interface DeviceConfig {
  id: string;
  name: string;
  type: DEVICE_CONFIG_TYPE;
  enable: boolean;
}

export class Winker {
  public api = winkerApi;
  public session: Session;
  public configDevices = new Map<string, DeviceConfig>();

  constructor(
    public readonly platform: WinkerHomebridgePlatform,
    public readonly config: Config,
    public readonly logger: Logger,
  ) {
    const { clientKey, portal, username, password } = config;
    this.session = new Session(username, password, clientKey, portal);

    (config.devices as DeviceConfig[])?.forEach((device) => {
      this.configDevices.set(device.id, device);
    });

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
        new Device(
          this.platform.api.hap.uuid.generate,
          device,
          this.configDevices.get(device.id_device),
        ),
    );
  }

  async openDoor(deviceId: string) {
    this.logger.debug(`Openning ${deviceId}`);
    return this.api.openDevice({
      id_portal: this.session.portal,
      device: {
        id_device: deviceId,
        state: DEVICE_STATE.OPEN,
      },
    });
  }
}
