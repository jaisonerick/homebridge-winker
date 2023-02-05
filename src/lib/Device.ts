import { DeviceConfig, DEVICE_CONFIG_TYPE } from './Winker';
import { Device as DeviceApi } from './winkerApi';

export const enum LockState {
  UNSECURED,
  SECURED,
  JAMMED,
  UNKNOWN,
}

export class Device {
  constructor(
    private readonly uuidGenerator: (string) => string,
    private readonly deviceData: DeviceApi,
    public readonly deviceConfig?: DeviceConfig,
  ) {}

  get deviceId() {
    return this.deviceData.id_device;
  }

  get model() {
    return `${this.type}-${this.deviceData.version}`;
  }

  get type() {
    return this.deviceConfig?.type || DEVICE_CONFIG_TYPE.STATELESS_DOOR;
  }

  get serialNumber() {
    return `winker-${this.deviceData.id_device}`;
  }

  get displayName() {
    return this.deviceConfig?.name || this.deviceData.name_device;
  }

  get currentLockState() {
    switch (this.deviceData.state) {
      case 'CLOSED':
        return LockState.SECURED;
      case 'OPEN':
        return LockState.UNSECURED;
    }
  }

  get UUID() {
    return this.uuidGenerator(this.serialNumber);
  }

  get isActive(): boolean {
    return !!this.deviceConfig?.enable;
  }
}
