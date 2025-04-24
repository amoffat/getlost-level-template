import * as host from "../api/w2h/host";
import * as timeUtils from "../utils/time";

const visitCount = new Map<string, u32>();

export function isNight(): bool {
  const ev = host.time.getSunEvent();
  return timeUtils.isNight(ev);
}

export function isDay(): bool {
  const ev = host.time.getSunEvent();
  return timeUtils.isDay(ev);
}

export function random(min: f32, max: f32): f32 {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: f32, max: f32): f32 {
  return Math.random() * (max - min) + min;
}

export function either<T>(options: T[]): T {
  const idx = Math.floor(Math.random() * options.length) as u32;
  return options[idx];
}

export function visited(id: string): u32 {
  if (!visitCount.has(id)) {
    return 0;
  }
  const count = visitCount.get(id);
  return count;
}

export function hasVisited(id: string): bool {
  return visitCount.has(id);
}

export function lastVisited(passage: string): u32 {
  return 0;
}

export function incrementVisitCount(id: string): void {
  if (!visitCount.has(id)) {
    visitCount.set(id, 0);
  }
  visitCount.set(id, visitCount.get(id) + 1);
}
