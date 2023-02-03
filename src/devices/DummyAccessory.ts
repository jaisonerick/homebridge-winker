import {
  PlatformAccessory,
  CharacteristicValue,
  Characteristic,
  Logger,
} from 'homebridge';
import { Device } from '../lib/Device';
import { WinkerHomebridgePlatform } from '../platform';

export class DummyAccessory {
  private stateOn = false;

  private stateActive = false;
  private currentHeaterCoolerState = 0;
  private targetHeaterCoolerState = 0;
  private currentTemperature = 23;
  private targetTemperature = 22;
  private heatingThresholdTemperature = 10;
  private coolingThresholdTemperature = 10;
  private swingMode = 0;
  private rotationSpeed = 0;
  private temperatureUnits = 0;

  private logger: Logger;

  constructor(
    private readonly platform: WinkerHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const device = this.accessory.context.device as Device;
    this.logger = platform.logger;
    const {
      Service: { AccessoryInformation },
      Characteristic,
    } = this.platform;

    const serviceAccessoryInformation =
      accessory.getService(AccessoryInformation) ||
      accessory.addService(AccessoryInformation);

    serviceAccessoryInformation
      .setCharacteristic(Characteristic.Manufacturer, 'Winker')
      .setCharacteristic(Characteristic.Model, 'Unknonw')
      .setCharacteristic(Characteristic.SerialNumber, device.serialNumber);

    this.setupAsCrazy();
  }

  setupAsLightbulb() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { Lightbulb },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(Lightbulb) ||
      this.accessory.addService(Lightbulb);

    service.setCharacteristic(Characteristic.Name, device.displayName);

    service
      .getCharacteristic(Characteristic.On)
      .onSet((value: CharacteristicValue) => (this.stateOn = value as boolean))
      .onGet(() => this.stateOn);
  }

  setupAsTemperature() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { HeaterCooler },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(HeaterCooler) ||
      this.accessory.addService(HeaterCooler);

    service.setCharacteristic(Characteristic.Name, device.displayName);

    service
      .getCharacteristic(Characteristic.Active)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('SetActive', value);
        this.stateActive = value as boolean;
      })
      .onGet(() => this.stateActive);

    service
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('setTargetHeaterCoolerState', value);
        this.targetHeaterCoolerState = value as number;
      })
      .onGet(() => this.targetHeaterCoolerState);

    service
      .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .onGet(() => this.currentHeaterCoolerState);

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .onGet(() => this.currentTemperature);

    service
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('setHeatingThresholdTemperature', value);
        this.heatingThresholdTemperature = value as number;
      })
      .onGet(() => this.heatingThresholdTemperature);

    service
      .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('CoolingThresholdTemperature', value);
        this.coolingThresholdTemperature = value as number;
      })
      .onGet(() => this.coolingThresholdTemperature);

    // service
    //   .getCharacteristic(Characteristic.TargetTemperature)
    //   .onSet((value: CharacteristicValue) => {
    //     this.logger.debug('TargetTemperature', value);
    //     this.targetTemperature = value as number;
    //   })
    //   .onGet(() => this.targetTemperature);

    service
      .getCharacteristic(Characteristic.SwingMode)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('SwingMode', value);
        this.swingMode = value as number;
      })
      .onGet(() => this.swingMode);

    service
      .getCharacteristic(Characteristic.RotationSpeed)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('RotationSpeed', value);
        this.rotationSpeed = value as number;
      })
      .onGet(() => this.rotationSpeed);
  }

  setupAsThermostat() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { Thermostat },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(Thermostat) ||
      this.accessory.addService(Thermostat);

    service.setCharacteristic(Characteristic.Name, device.displayName);

    service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('setTargetHeaterCoolerState', value);
        this.targetHeaterCoolerState = value as number;
      })
      .onGet(() => this.targetHeaterCoolerState);

    service
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .onGet(() => this.currentHeaterCoolerState);

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .onGet(() => this.currentTemperature);

    service
      .getCharacteristic(Characteristic.TargetTemperature)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('TargetTemperature', value);
        this.targetTemperature = value as number;
      })
      .onGet(() => this.targetTemperature);

    service
      .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('CoolingThresholdTemperature', value);
        this.coolingThresholdTemperature = value as number;
      })
      .onGet(() => this.coolingThresholdTemperature);

    service
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('temperatureUnits', value);
        this.temperatureUnits = value as number;
      })
      .onGet(() => this.temperatureUnits);
  }

  private CurrentPosition = 0;
  private PositionState = 0;
  private TargetPosition = 0;

  setupAsCrazy() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { Door },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(Door) || this.accessory.addService(Door);

    service.setCharacteristic(Characteristic.Name, device.displayName);

    service.getCharacteristic(Characteristic.CurrentPosition).onGet(() => {
      this.logger.debug('CurrentPosition');
      return this.CurrentPosition;
    });

    service
      .getCharacteristic(Characteristic.TargetPosition)
      .onGet(() => {
        this.logger.debug('TargetPosition');
        return this.TargetPosition;
      })
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('set TargetPosition', value);
        this.TargetPosition = value as number;
      });

    service
      .getCharacteristic(Characteristic.PositionState)
      .onGet(() => {
        this.logger.debug('PositionState');
        return this.PositionState;
      })
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('set PositionState', value);
        this.PositionState = value as number;
      });

    // this.setupDoorbell();
    this.setupLock();
  }

  private ProgrammableSwitchEvent = 0;

  setupDoorbell() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { Doorbell },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(Doorbell) ||
      this.accessory.addService(Doorbell);

    service.setCharacteristic(Characteristic.Name, 'Doorbell');

    service
      .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
      .onGet(() => {
        this.logger.debug('ProgrammableSwitchEvent');
        return this.ProgrammableSwitchEvent;
      });

    setInterval(() => {
      this.logger.debug('ProgrammableSwitchEvent');
      service.updateCharacteristic(
        Characteristic.ProgrammableSwitchEvent,
        Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      );
    }, 10000);
  }

  private LockCurrentState = 0;
  private LockTargetState = 0;

  setupLock() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { LockMechanism },
      Characteristic,
    } = this.platform;

    const service =
      this.accessory.getService(LockMechanism) ||
      this.accessory.addService(LockMechanism);

    service.setCharacteristic(Characteristic.Name, 'Locker');

    service.getCharacteristic(Characteristic.LockCurrentState).onGet(() => {
      this.logger.debug('LockCurrentState');
      return this.LockCurrentState;
    });

    service
      .getCharacteristic(Characteristic.LockTargetState)
      .onGet(() => {
        this.logger.debug('LockCurrentState');
        return this.LockCurrentState;
      })
      .onSet((value: CharacteristicValue) => {
        this.logger.debug('set LockCurrentState', value);
        this.LockTargetState = value as number;
      });
    //
    // setInterval(() => {
    //   this.logger.debug('ProgrammableSwitchEvent');
    //   service.updateCharacteristic(
    //     Characteristic.ProgrammableSwitchEvent,
    //     Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
    //   );
    // }, 10000);
  }

  updateAccessoryCharacteristic() {
    this.platform.logger.debug('TESTE');
    return this;
  }
}
