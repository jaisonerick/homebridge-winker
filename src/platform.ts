import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  Categories,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Winker, Config as WinkerConfig } from './lib/Winker';
import { WinkerDoor } from './devices/WinkerDoor';
import { Device } from './lib/Device';
import { DummyAccessory } from './devices/DummyAccessory';
import { ThrottleError } from './lib/winkerApi';

interface WinkerDevice {
  updateAccessoryCharacteristic(): WinkerDevice;
}

const DEFAULT_CHECK_FREQUENCY = 60;

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
    void this.discoverDevices().then(
      () => {
        this.activateMonitoring(DEFAULT_CHECK_FREQUENCY);
      },
      (error) => {
        if (error instanceof Error) {
          this.logger.error(error.message, error);
        } else {
          this.logger.error('Unknown error happened', error);
        }
      },
    );
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  async refreshDevices() {
    this.logger.debug('Refreshing devices...');
    if (!this.Winker) {
      return;
    }
    try {
      const devices = await this.Winker.getDevices();

      devices.forEach((device) => {
        const accessory = this.accessories.get(device.UUID);
        if (!accessory) {
          return;
        }
        accessory.context.device = device;
        this.api.updatePlatformAccessories([accessory]);
        this.winkerDevices.get(device.UUID)?.updateAccessoryCharacteristic();
      });
    } catch (error) {
      if (error instanceof ThrottleError) {
        return;
      }
      if (error instanceof Error) {
        this.logger.error(error.message, error);
      } else {
        this.logger.error('Unknown error happened', error);
      }
      return;
    }
  }

  async discoverDevices() {
    if (!this.Winker) {
      this.cleanupAccessories([]);
      this.addDummies();
      return;
    }
    try {
      const devices = await this.Winker.getDevices();

      devices.forEach((device) => {
        this.winkerDevices.set(device.UUID, this.setupDevice(device));
      });
      this.cleanupAccessories(devices);
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
      case 'dummy':
        return new DummyAccessory(this, accessory);
    }
    return new WinkerDoor(this, accessory);
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

  private cleanupAccessories(devices: Device[]) {
    const devicesIdx = devices.map((device) => device.UUID);

    this.accessories.forEach((accessory, uuid) => {
      if (devicesIdx.indexOf(uuid) < 0) {
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

  private addDummies() {
    const d = new Device(
      this.api.hap.uuid.generate,
      {
        id_device: 'nature-8',
        name_device: 'Porta 2',
        state: 'OPEN',
        event: 'EVENT',
        version: '1.2.5',
      },
      'dummy',
    );
    this.setupDevice(d);
  }

  activateMonitoring(checkFrequency: number) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.refreshInterval = setInterval(() => {
      void this.refreshDevices();
    }, checkFrequency * 1000);
  }

  async activateCloseMonitoring(
    forHowManySeconds: number,
    secondsBetweenChecks: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.activateMonitoring(secondsBetweenChecks);

      if (this.closeMonitoringTimeout) {
        // If already close monitoring, just start over the timer...
        this.closeMonitoringTimeout.refresh();
      }

      this.closeMonitoringTimeout = setTimeout(() => {
        this.closeMonitoringTimeout = undefined;
        this.activateMonitoring(DEFAULT_CHECK_FREQUENCY);

        resolve();
      }, forHowManySeconds * 1000);
    });
  }
}
