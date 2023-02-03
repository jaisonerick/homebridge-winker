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
    public readonly type: string,
  ) {}

  get deviceId() {
    return this.deviceData.id_device;
  }

  get model() {
    return `${this.type}-${this.deviceData.version}`;
  }

  get serialNumber() {
    return `winker-${this.deviceData.id_device}`;
  }

  get displayName() {
    return this.deviceData.name_device;
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
}
