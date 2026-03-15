export enum SunEvent {
  /** sunrise (top edge of the sun appears on the horizon) */
  Sunrise = 0,
  /** sunrise ends (bottom edge of the sun touches the horizon) */
  SunriseEnd = 1,
  /** morning golden hour (soft light, best time for photography) ends */
  GoldenHourEnd = 2,
  /** solar noon (sun is in the highest position) */
  SolarNoon = 3,
  /** evening golden hour starts */
  GoldenHour = 4,
  /** sunset starts (bottom edge of the sun touches the horizon) */
  SunsetStart = 5,
  /** sunset (sun disappears below the horizon, evening civil twilight starts) */
  Sunset = 6,
  /** dusk (evening nautical twilight starts) */
  Dusk = 7,
  /** nautical dusk (evening astronomical twilight starts) */
  NauticalDusk = 8,
  /** night starts (dark enough for astronomical observations) */
  Night = 9,
  /** nadir (darkest moment of the night, sun is in the lowest position) */
  Nadir = 10,
  /** night ends (morning astronomical twilight starts) */
  NightEnd = 11,
  /** nautical dawn (morning nautical twilight starts) */
  NauticalDawn = 12,
  /** dawn (morning nautical twilight ends, morning civil twilight starts) */
  Dawn = 13,
}

export function getSunEventName(value: SunEvent): string {
  switch (value) {
    case SunEvent.Sunrise:
      return "Sunrise";
    case SunEvent.SunriseEnd:
      return "SunriseEnd";
    case SunEvent.GoldenHourEnd:
      return "GoldenHourEnd";
    case SunEvent.SolarNoon:
      return "SolarNoon";
    case SunEvent.GoldenHour:
      return "GoldenHour";
    case SunEvent.SunsetStart:
      return "SunsetStart";
    case SunEvent.Sunset:
      return "Sunset";
    case SunEvent.Dusk:
      return "Dusk";
    case SunEvent.NauticalDusk:
      return "NauticalDusk";
    case SunEvent.Night:
      return "Night";
    case SunEvent.Nadir:
      return "Nadir";
    case SunEvent.NightEnd:
      return "NightEnd";
    case SunEvent.NauticalDawn:
      return "NauticalDawn";
    case SunEvent.Dawn:
      return "Dawn";
    default:
      return "Unknown";
  }
}
