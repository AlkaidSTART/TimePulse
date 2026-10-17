declare module 'solarlunar' {
  interface SolarDate {
    cYear: number;
    cMonth: number;
    cDay: number;
  }

  interface LunarDate {
    lYear: number;
    lMonth: number;
    lDay: number;
    monthCn: string;
    dayCn: string;
    animal?: string;
    yearCn?: string;
    term?: string;
    isLeap?: boolean;
    [key: string]: any;
  }

  interface SolarLunar {
    lunar2solar(year: number, month: number, day: number, isLeapMonth?: boolean): SolarDate | -1;
    solar2lunar(year: number, month: number, day: number): LunarDate | -1;
  }

  const solarlunar: SolarLunar;
  export default solarlunar;
}
