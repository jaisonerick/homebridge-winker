import { z } from 'zod';
import { makeApi, Zodios, ZodiosPlugin } from '@zodios/core';
import { BASE_URL } from '../settings';
import { Session } from './Session';
import { pluginApi } from '@zodios/plugins';

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

type Logger = Pick<typeof console, 'debug'>;

function pluginLogger(provider: Logger): ZodiosPlugin {
  return {
    request: async (_, config) => {
      provider.debug(
        `[WinkerAPI] Request ${config.method} ${config.baseURL || ''}${
          config.url
        }`,
      );
      return config;
    },
    response: async (_, config, response) => {
      provider.debug(
        `[WinkerAPI] Response ${config.method} ${config.baseURL || ''}${
          config.url
        }`,
      );
      return response;
    },
  };
}

export const winkerApi = new Zodios(BASE_URL, [...loginApi, ...portalApi]);

export function setupApi(session: Session, logger: Logger) {
  winkerApi.use(pluginLogger(logger));
  winkerApi.use(pluginApi());
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
        }
        return session.authToken;
      },
    }),
  );
}
