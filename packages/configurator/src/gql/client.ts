import { ApolloClient, InMemoryCache } from "@apollo/client";
import {
  ports,
  isOpen,
  open,
  readAttitude,
  close,
  apiVersion,
  bytesRead,
  bytesWritten,
  packetErrors,
  readExtendedStatus,
  readRcValues,
  readRCTuning,
  readRCDeadband,
  calibrateAccelerometer,
  readFeatures,
  readRawGPS,
  readAnalogValues,
  readBoardInfo,
} from "@fresh/msp";
import semver from "semver";
import {
  Resolvers,
  ConnectionStateQueryVariables,
  ConnectionStateDocument,
  ConnectionStateQuery,
  LogsQuery,
  LogsQueryVariables,
  LogsDocument,
} from "./__generated__";
import config from "../config";
import { versionInfo } from "../util";

interface Context {
  client: ApolloClient<object>;
}

const cache = new InMemoryCache();

const selectedPort = cache.makeVar<string | null>(null);
// default baudrate
const selectedBaud = cache.makeVar<number>(115200);

const expertMode = cache.makeVar<boolean>(false);
const selectedTab = cache.makeVar<string | null>(null);

cache.policies.addTypePolicies({
  Configurator: {
    fields: {
      port: () => selectedPort(),
      baudRate: () => selectedBaud(),
      tab: () => selectedTab(),
      expertMode: () => expertMode(),
    },
  },
});

const setConnectionState = (
  client: ApolloClient<object>,
  port: string,
  connecting: boolean,
  connected: boolean
): void =>
  client.writeQuery<ConnectionStateQuery, ConnectionStateQueryVariables>({
    query: ConnectionStateDocument,
    data: {
      __typename: "Query",
      device: {
        connection: {
          connected,
          connecting,
          __typename: "ConnectionStatus",
        },
        __typename: "FlightController",
      },
    },
    variables: {
      port,
    },
  });

const log = (client: ApolloClient<object>, message: string): void => {
  const data = client.readQuery<LogsQuery, LogsQueryVariables>({
    query: LogsDocument,
  });

  client.writeQuery<LogsQuery, LogsQueryVariables>({
    query: LogsDocument,
    data: {
      configurator: {
        logs: [
          ...(data?.configurator.logs ?? []).concat({
            time: new Date().toISOString(),
            message,
            __typename: "Log" as const,
          }),
        ],
        __typename: "Configurator",
      },
      __typename: "Query",
    },
  });
};

const resolvers: Resolvers = {
  Query: {
    ports: () => ports(),
    device: (_, { port }) => ({
      port,
      apiVersion: "",
      connection: {
        port,
        connecting: false,
        connected: false,
        __typename: "ConnectionStatus",
      },
      __typename: "FlightController",
    }),
    configurator: () => {
      const { os, version, chromeVersion } = versionInfo();
      return {
        port: selectedPort(),
        baudRate: selectedBaud(),
        tab: selectedTab(),
        expertMode: expertMode(),
        logs: [
          {
            time: new Date().toISOString(),
            message: `Running - OS: <strong>${os}</strong>, Chrome: <strong>${chromeVersion}</strong>, Configurator: <strong>${version}</strong>`,
            __typename: "Log",
          },
        ],
        __typename: "Configurator",
      };
    },
  },
  Mutation: {
    connect: async (_, { port, baudRate }, { client }: Context) => {
      if (isOpen(port)) {
        return true;
      }

      let closed = false;

      setConnectionState(client, port, true, false);
      log(client, `Opening connection on ${port}`);

      try {
        await open(port, { baudRate }, () => {
          // on disconnect
          log(
            client,
            `Serial port <span class="message-positive">successfully</span> closed on ${port}`
          );
          setConnectionState(client, port, false, false);
          closed = true;
        });

        log(
          client,
          `Serial port <span class="message-positive">successfully</span> opened on ${port}`
        );

        const version = apiVersion(port);
        log(client, `MultiWii API version: <strong>${version}</strong>`);

        if (semver.gte(version, config.apiVersionAccepted)) {
          setConnectionState(client, port, false, true);
          return true;
        }
        log(
          client,
          `MSP version not supported: <span class="message-negative">${version}</span>`
        );
      } catch (e) {
        log(
          client,
          `Could not open connection (<span class="message-negative">${e.message}</span>), communication <span class="message-negative">failed</span>`
        );
      }

      // And only close the port if we are connecting
      if (!closed) {
        await close(port);
        setConnectionState(client, port, false, false);
      }

      return false;
    },
    disconnect: async (_, { port }, { client }: Context) => {
      if (!isOpen(port)) {
        return true;
      }

      await close(port);
      setConnectionState(client, port, false, false);

      return true;
    },

    setTab: (_, { tabId }) => !!selectedTab(tabId),
    setConnectionSettings: (_, { port, baudRate }) => {
      selectedPort(port);
      if (typeof baudRate === "number") {
        selectedBaud(baudRate);
      }
      return true;
    },
    setExpertMode: (_, { enabled }) => !!expertMode(enabled),
    log: (_, { message }, { client }: Context) => {
      log(client, message);
      return true;
    },
    deviceCallibrateAccelerometer: (_, { port }) =>
      calibrateAccelerometer(port).then(() => null),
  },

  FlightController: {
    attitude: ({ port }) =>
      readAttitude(port).then((values) => ({
        ...values,
        __typename: "Attitude",
      })),
    status: ({ port }) =>
      readExtendedStatus(port).then((values) => ({
        ...values,
        __typename: "Status",
      })),
    rc: ({ port }) => ({
      port,
      __typename: "RC",
    }),
    apiVersion: ({ port }) => apiVersion(port),
    profile: ({ port }) =>
      readExtendedStatus(port).then(({ profile }) => profile),
    numProfiles: ({ port }) =>
      readExtendedStatus(port).then(({ numProfiles }) => numProfiles),
    armingDisabledFlags: ({ port }) =>
      readExtendedStatus(port).then(
        ({ armingDisabledFlags }) => armingDisabledFlags
      ),
    sensors: ({ port }) =>
      readExtendedStatus(port).then(({ sensors }) => sensors),
    features: ({ port }) =>
      readFeatures(port).then((features) =>
        features.map((feature) => ({ ...feature, __typename: "Feature" }))
      ),
    gps: ({ port }) =>
      readRawGPS(port).then((gpsData) => ({
        ...gpsData,
        __typename: "GpsData",
      })),
    power: ({ port }) =>
      readAnalogValues(port).then((values) => ({
        ...values,
        __typename: "Power",
      })),
    boardInfo: ({ port }) =>
      readBoardInfo(port).then((values) => ({
        ...values,
        __typename: "BoardInfo",
      })),
  },
  ConnectionStatus: {
    bytesRead: ({ port }) => bytesRead(port),
    bytesWritten: ({ port }) => bytesWritten(port),
    packetErrors: ({ port }) => packetErrors(port),
  },
  RC: {
    channels: ({ port }) => readRcValues(port),
    tuning: ({ port }) =>
      readRCTuning(port).then((values) => ({
        ...values,
        __typename: "RCTuning",
      })),
    deadband: ({ port }) =>
      readRCDeadband(port).then((values) => ({
        ...values,
        __typename: "RCDeadband",
      })),
    rssi: ({ port }) => readAnalogValues(port).then(({ rssi }) => rssi),
  },
};

const client = new ApolloClient({
  cache,
  // generated resolvers are not compatible with apollo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolvers: resolvers as any,
});

export default client;
