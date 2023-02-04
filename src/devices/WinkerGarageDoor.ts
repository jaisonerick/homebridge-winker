import { Device } from '../lib/Device';
import { WinkerBaseDoor } from './WinkerBaseDoor';

export class WinkerGarageDoor extends WinkerBaseDoor {
  private StateTargetDoor = 0;

  setupDoor() {
    const device = this.accessory.context.device as Device;

    const {
      Service: { GarageDoorOpener },
      Characteristic,
    } = this.platform;

    return {
      service: GarageDoorOpener,
      characteristics: [
        {
          name: Characteristic.CurrentDoorState,
          value: () => device.currentLockState,
        },
        {
          name: Characteristic.TargetDoorState,
          value: () => this.StateTargetDoor,
          change: this.openDoor.bind(this),
        },
      ],
    };
  }

  teste() {
    this.setupDoor().characteristics[0]?.change(1);
  }

  openDoor(value: number) {}
}
