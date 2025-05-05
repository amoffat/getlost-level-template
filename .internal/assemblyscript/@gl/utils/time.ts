import { SunEvent } from "../types/time";

/**
 * Check if the given SunTime value represents a daytime period.
 * @param {SunEvent} time - The SunTime value to check.
 * @returns {boolean} - True if the time is a daytime period, false otherwise.
 */
export function isDay(time: SunEvent): boolean {
  return (
    time === SunEvent.Sunrise ||
    time === SunEvent.SunriseEnd ||
    time === SunEvent.GoldenHourEnd ||
    time === SunEvent.SolarNoon ||
    time === SunEvent.GoldenHour ||
    time === SunEvent.SunsetStart ||
    time === SunEvent.Sunset
  );
}

/**
 * Check if the given SunTime value represents a nighttime period.
 * @param {SunEvent} time - The SunTime value to check.
 * @returns {boolean} - True if the time is a nighttime period, false otherwise.
 */
export function isNight(time: SunEvent): boolean {
  return (
    time === SunEvent.Dusk ||
    time === SunEvent.NauticalDusk ||
    time === SunEvent.Night ||
    time === SunEvent.Nadir ||
    time === SunEvent.NightEnd ||
    time === SunEvent.NauticalDawn ||
    time === SunEvent.Dawn
  );
}

/**
 * Check if the given SunTime value represents a twilight period.
 * @param {SunEvent} time - The SunTime value to check.
 * @returns {boolean} - True if the time is a twilight period, false otherwise.
 */
export function isTwilight(time: SunEvent): boolean {
  return (
    time === SunEvent.Dawn ||
    time === SunEvent.NauticalDawn ||
    time === SunEvent.NauticalDusk ||
    time === SunEvent.Dusk
  );
}

/**
 * Check if the given SunTime value represents a morning period.
 * @param {SunEvent} time - The SunTime value to check.
 * @returns {boolean} - True if the time is a morning period, false otherwise.
 */
export function isMorning(time: SunEvent): boolean {
  return (
    time === SunEvent.Sunrise ||
    time === SunEvent.SunriseEnd ||
    time === SunEvent.GoldenHourEnd ||
    time === SunEvent.SolarNoon
  );
}

/**
 * Check if the given SunTime value represents an evening period.
 * @param {SunEvent} time - The SunTime value to check.
 * @returns {boolean} - True if the time is an evening period, false otherwise.
 */
export function isEvening(time: SunEvent): boolean {
  return (
    time === SunEvent.GoldenHour ||
    time === SunEvent.SunsetStart ||
    time === SunEvent.Sunset ||
    time === SunEvent.Dusk
  );
}
