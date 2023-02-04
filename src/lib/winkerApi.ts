import { object, z } from 'zod';
import { makeApi, Zodios, ZodiosPlugin } from '@zodios/core';
import { BASE_URL } from '../settings';
import { Session } from './Session';
import { pluginApi } from '@zodios/plugins';
import { AxiosError } from 'axios';

export class ThrottleError extends Error {}

export const login = z.object({
  token: z.string(),
  id_user: z.number(),
});

export type Login = z.infer<typeof login>;

export const loginApi = makeApi([
  {
    method: 'post',
    path: 'auth/login',
    alias: 'login',
    description: 'Authenticate',
    response: login,
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({
          username: z.string(),
          password: z.string(),
          key: z.string(),
        }),
      },
    ],
  },
]);

export const portal = z.object({
  id_portal: z.number(),
  name: z.string(),
});

export type Portal = z.infer<typeof portal>;

export const fullPortal = z.object({
  portal: z.object({
    name: z.string(),
    units_with_user_responsible: z.array(
      z.object({
        id_user_unit: z.number(),
        id_user: z.number(),
      }),
    ),
  }),
});

export type FullPortal = z.infer<typeof fullPortal>;

export const portalApi = makeApi([
  {
    method: 'get',
    path: 'me/portals',
    alias: 'getPortals',
    description: 'Get a user portals',
    response: z.array(portal),
  },
  {
    method: 'post',
    path: 'me/change-portal',
    alias: 'changePortal',
    response: fullPortal,
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({
          id_portal: z.number(),
        }),
      },
    ],
  },
]);

export const enum DEVICE_STATE {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const device = z.object({
  id_device: z.string(),
  name_device: z.string(),
  state: z.enum([DEVICE_STATE.OPEN, DEVICE_STATE.CLOSED]),
  event: z.string(),
  version: z.string(),
});

export type Device = z.infer<typeof device>;

export const deviceApi = makeApi([
  {
    method: 'get',
    path: 'access-control/user/devices',
    alias: 'getDevices',
    description: 'Get all devices for a portal',
    response: z.array(device),
    parameters: [
      {
        name: 'id_portal',
        type: 'Query',
        schema: z.number(),
      },
    ],
  },
  {
    method: 'post',
    path: 'access-control/user/device/open',
    alias: 'openDevice',
    description: 'Open a specific device',
    response: z.any(),
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({
          device: z.object({
            id_device: z.string(),
            state: z.enum(['OPEN', 'CLOSED']),
          }),
          id_portal: z.number(),
        }),
      },
    ],
  },
]);

function pluginApiKey(provider: {
  getToken: () => Promise<string | undefined>;
}): ZodiosPlugin {
  return {
    request: async (_, config) => {
      if (config.url === 'auth/login') {
        return config;
      }
      const token = await provider.getToken();

      if (token) {
        return {
          ...config,
          headers: {
            ...config.headers,
            Authorization: token,
          },
        };
      }
      return config;
    },
  };
}

function pluginErrorHandler(): ZodiosPlugin {
  return {
    error: async (_api, _config, error) => {
      if (error instanceof AxiosError) {
        if (error.response && error.response.status === 400) {
          return Promise.reject(new ThrottleError());
        }
      }
      return Promise.reject(error);
    },
  };
}

function filterSensitiveData(data: unknown) {
  if (data instanceof Object) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        return [
          key,
          [/password/i, /key/i, /token/i, /secret/i].some((reg) =>
            reg.test(key),
          )
            ? '************'
            : value,
        ];
      }),
    );
  }
  return data;
}

function pluginLogger(logger: Logger): ZodiosPlugin {
  return {
    request: async (_api, config) => {
      logger.debug(
        `[winkerApi] ${config.method || ''} ${config.baseURL || ''}${
          config.url || ''
        }`,
        config.queries,
        filterSensitiveData(config.data),
      );
      return config;
    },
    response: async (_api, _config, response) => {
      return response;
    },
    error: async (_api, config, error) => {
      logger.error(
        `[winkerApi] Error on request :: ${config.method || ''} ${
          config.baseURL || ''
        }${config.url || ''}`,
      );
      return Promise.reject(error);
    },
  };
}

type Logger = Pick<typeof console, 'debug' | 'error' | 'info'>;

export const winkerApi = new Zodios(BASE_URL, [
  ...loginApi,
  ...portalApi,
  ...deviceApi,
]);

export function setupApi(session: Session, logger: Logger) {
  winkerApi.use(pluginErrorHandler());
  winkerApi.use(pluginApi());
  winkerApi.use(pluginLogger(logger));
  winkerApi.use(
    pluginApiKey({
      getToken: async () => {
        if (!session.authToken) {
          session.reset();

          const loginResponse = await winkerApi.login({
            username: session.username,
            password: session.password,
            key: session.clientKey,
          });

          session.authToken = loginResponse.token;
          session.idUser = loginResponse.id_user;

          const portalResponse = await winkerApi.changePortal({
            id_portal: session.portal,
          });
          session.updateFromPortal(portalResponse.portal);

          logger.info(
            `Authenticated as ${session.username} on portal ${portalResponse.portal.name}`,
          );
        }
        return session.authToken;
      },
    }),
  );
}
