import { Device } from '../lib/Device';
import { WinkerBaseDoor } from './WinkerBaseDoor';

export class WinkerDoor extends WinkerBaseDoor {
  setupDoor() {
    const device = this.accessory.context.device as Device;
    const {
      Service: { LockMechanism },
      Characteristic,
    } = this.platform;

    return {
      service: LockMechanism,
      characteristics: [
        {
          name: Characteristic.LockCurrentState,
          value: () => device.currentLockState,
        },
        {
          name: Characteristic.LockTargetState,
          value: () => null,
          // change: this.openDoor.bind(this),
        },
      ],
    };
  }
}
