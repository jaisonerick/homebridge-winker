import EventEmitter from 'events';
import { CharacteristicValue, Logger, PlatformAccessory } from 'homebridge';
import { Device, LockState } from '../lib/Device';
import { Winker } from '../lib/Winker';
import { WinkerHomebridgePlatform } from '../platform';

export class StatelessDoor {
  protected logger: Logger = this.platform.logger;
  protected Winker?: Winker = this.platform.Winker;
  public State = new DoorState(this.platform);

  constructor(
    protected readonly platform: WinkerHomebridgePlatform,
    protected readonly accessory: PlatformAccessory,
  ) {
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

  updateAccessoryCharacteristic() {
    this.logger.debug('Trying to update StatelessDoor');
    return this;
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
      .onGet(() => this.State.CurrentState);

    this.State.on(DoorStateEvents.CHANGE_CURRENT_STATE, (newValue: number) => {
      service
        .getCharacteristic(Characteristic.LockCurrentState)
        .updateValue(newValue);
    });
    this.State.on(DoorStateEvents.CHANGE_TARGET_STATE, (newValue: number) => {
      service
        .getCharacteristic(Characteristic.LockTargetState)
        .updateValue(newValue);
    });

    service
      .getCharacteristic(Characteristic.LockTargetState)
      .updateValue(this.State.TargetState)
      .onGet(() => {
        this.logger.debug(
          `Homekit retrieving target lock state for ${device.displayName}: ${this.State.TargetState}`,
        );
        return this.State.TargetState;
      })
      .onSet((value: CharacteristicValue) => {
        if (typeof value !== 'number') {
          return;
        }

        this.logger.info(
          `Setting target state of ${device.displayName} to ${value.toString()}`,
        );

        if (value === LockState.UNSECURED) {
          void this.State.open(async () => {
            if (!this.Winker) {
              return;
            }

            const device = this.accessory.context.device as Device;

            try {
              await this.Winker.openDoor(device.deviceId);

              this.logger.info(
                `Successfully remotely set ${device.displayName} target lock state to OPEN`,
              );
            } catch (error) {
              this.logger.error(
                `Server error on settingm ${device.displayName} target lock state to OPEN`,
              );
            }
          });
        }
      });
  }
}

const enum DoorStateEvents {
  CHANGE_TARGET_STATE = 'change.TargetState',
  CHANGE_CURRENT_STATE = 'change.CurrentState',
}

class DoorState extends EventEmitter {
  private _CurrentState: number;
  private _TargetState: number;
  private Characteristic = this.platform.Characteristic;

  constructor(protected readonly platform: WinkerHomebridgePlatform) {
    super();

    this._CurrentState = this.Characteristic.LockCurrentState.SECURED;
    this._TargetState = this.Characteristic.LockTargetState.SECURED;
  }

  private set TargetState(value: number) {
    this._TargetState = value;
    this.emit(DoorStateEvents.CHANGE_TARGET_STATE, value);
  }

  get TargetState() {
    return this._TargetState;
  }

  private set CurrentState(value: number) {
    this._CurrentState = value;
    this.emit(DoorStateEvents.CHANGE_CURRENT_STATE, value);
  }

  get CurrentState() {
    return this._CurrentState;
  }

  private openningPromise?: Promise<void>;

  open(runOpen: () => Promise<unknown>) {
    if (!this.openningPromise) {
      this.TargetState = this.Characteristic.LockTargetState.UNSECURED;

      this.openningPromise = new Promise<void>((resolve, reject) => {
        runOpen().then(() => {
          this.CurrentState = this.Characteristic.LockCurrentState.UNSECURED;
          setTimeout(() => {
            this.TargetState = this.Characteristic.LockTargetState.SECURED;
            this.CurrentState = this.Characteristic.LockTargetState.SECURED;

            this.openningPromise = undefined;
            resolve();
          }, 5000);
        }, reject);
      });
    }
    return this.openningPromise;
  }
}
