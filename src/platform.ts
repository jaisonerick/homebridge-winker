import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import {
  Winker,
  Config as WinkerConfig,
  DEVICE_CONFIG_TYPE,
} from './lib/Winker';
import { Device } from './lib/Device';
import { ThrottleError } from './lib/winkerApi';
import { StatelessDoor } from './devices/StatelessDoor';

interface WinkerDevice {
  updateAccessoryCharacteristic(): WinkerDevice;
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class WinkerHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public accessories = new Map<string, PlatformAccessory>();
  public winkerDevices = new Map<string, WinkerDevice>();

  private refreshInterval?: ReturnType<typeof setInterval>;
  private closeMonitoringTimeout?: ReturnType<typeof setTimeout>;

  public readonly Winker?: Winker;

  constructor(
    public readonly logger: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.logger.debug('Finished initializing platform:', this.config.name);

    if (
      !config.testString &&
      config.clientKey &&
      config.portal &&
      config.username &&
      config.password
    ) {
      this.Winker = new Winker(this, config as WinkerConfig, logger);
    } else {
      this.logger.error('Missing required config parameter.');
    }

    this.api.on('didFinishLaunching', () => {
      this.logger.debug('Executed didFinishLaunching callback');
      this.didFinishLaunching();
    });
  }

  didFinishLaunching() {
    this.discoverDevices().then(null, (error) => {
      if (error instanceof Error) {
        this.logger.error(error.message, error);
      } else {
        this.logger.error('Unknown error happened', error);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  async discoverDevices() {
    if (!this.Winker) {
      return;
    }
    try {
      const devices = await this.Winker.getDevices();

      devices
        .filter((device) => device.isActive)
        .forEach((device) => {
          this.winkerDevices.set(device.UUID, this.setupDevice(device));
        });
      this.cleanupAccessories();
    } catch (error) {
      if (error instanceof ThrottleError) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.discoverDevices().then(resolve, reject);
          }, 5000);
        });
      }
      throw error;
    }
  }

  private setupDevice(device: Device): WinkerDevice {
    const existingDevice = this.accessories.get(device.UUID);
    if (existingDevice) {
      existingDevice.context.device = device;
      this.api.updatePlatformAccessories([existingDevice]);
    }
    this.logger.info(
      `${
        existingDevice
          ? `Reloading ${device.type} from Winker:`
          : `Discovered new ${device.type} from Winker:`
      } "${device.displayName}"`,
    );
    const accessory = existingDevice ?? this.createAccessory(device);
    switch (device.type) {
      case DEVICE_CONFIG_TYPE.STATELESS_DOOR:
        return new StatelessDoor(this, accessory);
    }
  }

  private createAccessory(device: Device) {
    const accessory = new this.api.platformAccessory(
      device.displayName,
      device.UUID,
    );
    accessory.context.device = device;
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      accessory,
    ]);
    this.accessories.set(accessory.UUID, accessory);
    return accessory;
  }

  private cleanupAccessories() {
    this.logger.info('Cleaning up unusted accessories');
    this.accessories.forEach((accessory, uuid) => {
      if (!this.winkerDevices.has(uuid)) {
        this.logger.info(
          'Removing accessory:',
          accessory.displayName,
          accessory.UUID,
        );
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
        this.accessories.delete(uuid);
      }
    });
  }
}
