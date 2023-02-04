import { PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import { Device, LockState } from '../lib/Device';
import { Winker } from '../lib/Winker';
import { DEVICE_STATE } from '../lib/winkerApi';
import { WinkerHomebridgePlatform } from '../platform';

export class WinkerBaseDoor {
  private LockTargetState = 0;
  protected logger: Logger;
  protected Winker?: Winker;

  constructor(
    protected readonly platform: WinkerHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
  ) {
    this.logger = platform.logger;
    this.Winker = platform.Winker;
    const device = accessory.context.device as Device;
    const {
      Service: { AccessoryInformation },
      Characteristic,
    } = this.platform;

    const serviceAccessoryInformation =
      accessory.getService(AccessoryInformation) ||
      accessory.addService(AccessoryInformation);

    serviceAccessoryInformation
      .setCharacteristic(Characteristic.Manufacturer, 'Winker')
      .setCharacteristic(Characteristic.Model, device.model)
      .setCharacteristic(Characteristic.SerialNumber, device.serialNumber);

    this.setupDoorLock();
  }

  setupDoorLock() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { LockMechanism },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(LockMechanism) ||
      this.accessory.addService(LockMechanism);

    service.setCharacteristic(Characteristic.Name, device.displayName);

    service
      .getCharacteristic(Characteristic.LockCurrentState)
      .updateValue(device.currentLockState)
      .onGet(() => {
        this.logger.debug(
          `Homekit retrieving current lock state for ${device.displayName}: ${device.currentLockState}`,
        );
        return device.currentLockState;
      });

    this.LockTargetState = device.currentLockState;
    service
      .getCharacteristic(Characteristic.LockTargetState)
      .updateValue(device.currentLockState)
      .onGet(() => {
        this.logger.debug(
          `Homekit retrieving target lock state for ${device.displayName}: ${device.currentLockState}`,
        );
        return this.LockTargetState;
      })
      .onSet((value: CharacteristicValue) => {
        if (typeof value !== 'number') {
          return;
        }

        this.logger.debug(
          `Setting target state of ${device.displayName} to ${value.toString()}`,
        );

        if (value === LockState.UNSECURED) {
          void this.openTheDoor();
        }
      });
  }

  updateAccessoryCharacteristic() {
    const device = this.accessory.context.device as Device;

    const {
      Service: { LockMechanism },
      Characteristic,
    } = this.platform;

    const service = this.accessory.getService(LockMechanism);
    if (!service) {
      return this;
    }

    this.logger.debug(
      `Refreshing ${device.displayName} lock state to ${device.currentLockState}`,
    );
    service.updateCharacteristic(
      Characteristic.LockCurrentState,
      device.currentLockState,
    );

    if (
      device.currentLockState === LockState.UNSECURED &&
      this.LockTargetState === LockState.SECURED
    ) {
      void this.platform.activateCloseMonitoring(30, 10);
    }

    this.LockTargetState = device.currentLockState;
    service.updateCharacteristic(
      Characteristic.LockTargetState,
      this.LockTargetState,
    );

    return this;
  }

  protected async openTheDoor() {
    if (!this.Winker) {
      return;
    }
    const device = this.accessory.context.device as Device;

    try {
      await this.Winker.setDeviceState(device.deviceId, DEVICE_STATE.OPEN);

      this.logger.debug(
        `Successfully remotely set ${device.displayName} target lock state to OPEN`,
      );

      // For the next 30 seconds, ping for device state every 5 seconds.
      await this.platform.activateCloseMonitoring(30, 5);
    } catch (error) {
      this.logger.error(
        `Server error on settingm ${device.displayName} target lock state to OPEN`,
      );
    }
  }
}
