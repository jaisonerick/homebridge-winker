import { Logger, PlatformConfig } from 'homebridge';
import { WinkerHomebridgePlatform } from '../platform';
import { Session } from './Session';
import { setupApi, winkerApi } from './winkerApi';

interface Config extends PlatformConfig {
  clientKey: string;
  portal: number;
  username: string;
  password: string;
}

export class Winker {
  public api = winkerApi;

  constructor(
    public readonly platform: WinkerHomebridgePlatform,
    public readonly config: Config,
    public readonly logger: Logger,
  ) {
    const { clientKey, portal, username, password } = config,
      session = new Session(username, password, clientKey, portal);

    setupApi(session, logger);
  }
}
