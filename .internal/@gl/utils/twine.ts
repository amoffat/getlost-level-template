import * as map from "@gl/api/map";
import * as markers from "@gl/api/markers";
import * as pickup from "@gl/api/pickup";
import * as time from "@gl/api/time";
import * as timeUtils from "./time";

const visitCount = new Map<string, number>();

export function isNight(): boolean {
  const ev = time.getSunEvent();
  return timeUtils.isNight(ev);
}

export function isDay(): boolean {
  const ev = time.getSunEvent();
  return timeUtils.isDay(ev);
}

export function random(min: number, max: number): number {
  return Math.floor((Math.random() * (max - min + 1)) as number) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function either<T>(options: T[]): T {
  const idx = Math.floor(Math.random() * options.length) as number;
  return options[idx]!;
}

export function recordMarker(slug: string): void {
  markers.record(slug, true);
}

export function queryMarker(name: string): Promise<boolean> {
  return markers.query(name, true);
}

export function visited(id: string): number {
  return visitCount.get(id) ?? 0;
}

export function hasVisited(id: string): boolean {
  return visited(id) > 1;
}

export function lastVisited(passage: string): number {
  return 0;
}

export function incrementVisitCount(id: string): void {
  if (!visitCount.has(id)) {
    visitCount.set(id, 0);
  }
  visitCount.set(id, visitCount.get(id)! + 1);
}

export function exit(name: string, force: boolean = false): Promise<boolean> {
  return map.exit(name, force);
}

export function hasPickup(tag: string): Promise<boolean> {
  return pickup.query(tag);
}
