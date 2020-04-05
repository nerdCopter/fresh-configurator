export interface VoltageMeters {
  id: number;
  voltage: number;
}

export interface AnalogValues {
  voltage: number;
  mahDrawn: number;
  rssi: number;
  amperage: number;
}

export interface RawGpsData {
  fix: number;
  numSat: number;
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  groundCourse: number;
}

export interface BoardInfo {
  boardIdentifier: string;
  boardVersion: number;
  boardType: number;
  targetCapabilities: number;
  targetName: string;
  boardName: string;
  manufacturerId: string;
  signature: number[];
  mcuTypeId: number;
  configurationState: number | undefined;
  sampleRateHz: number | undefined;
}

export type ImuUnit = [number, number, number];

export interface ImuData {
  accelerometer: ImuUnit;
  gyroscope: ImuUnit;
  magnetometer: ImuUnit;
}

export interface Kinematics {
  roll: number;
  pitch: number;
  heading: number;
}

export interface Status {
  cycleTime: number;
  i2cError: number;
  activeSensors: number;
  mode: number;
  profile: number;
}

export interface ExtendedStatus extends Status {
  cpuload: number;
  numProfiles: number;
  rateProfile: number;
  armingDisableCount?: number;
  armingDisableFlags?: number;
}

export interface RcTuning {
  rcRate: number;
  rcExpo: number;
  rollPitchRate: number;
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  dynamicThrottlePid: number;
  throttleMid: number;
  throttleExpo: number;
  dynamicThrottleBreakpoint: number;
  rcYawExpo: number;
  rcYawRate: number;
  rcPitchRate: number;
  rcPitchExpo: number;
  throttleLimitType: number;
  throttleLimitPercent: number;
  rollRateLimit: number;
  pitchRateLimit: number;
  yawRateLimit: number;
}

export interface RcDeadband {
  deadband: number;
  yawDeadband: number;
  altHoldDeadhand: number;
  deadband3dThrottle: number;
}

export const OSD_LINE_SIZE = 30;
