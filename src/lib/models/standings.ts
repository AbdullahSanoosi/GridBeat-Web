/**
 * Ported from GridBeat (Flutter) lib/features/standings/data/models/standings_models.dart.
 * Simplified vs. the Flutter version: that one reshapes stats-api rows into a
 * Jolpica-nested, string-typed JSON shape purely so it could reuse a model
 * originally written for Ergast responses. There's no such legacy model to
 * reuse here, so these map directly off the stats-api row shape instead.
 */
import type { Row } from "@/lib/api/types";

export interface F1Driver {
  driverId: string;
  givenName: string;
  familyName: string;
  code: string | null;
  nationality: string | null;
  permanentNumber: string | null;
  dateOfBirth: string | null;
}

export interface F1Constructor {
  constructorId: string;
  name: string;
  nationality: string | null;
}

export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  driver: F1Driver;
  constructor: F1Constructor | null;
}

export interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  constructor: F1Constructor;
}

export function driverFullName(d: F1Driver): string {
  return `${d.givenName} ${d.familyName}`.trim();
}

export function driverInitials(d: F1Driver): string {
  return d.code ?? `${d.givenName[0] ?? ""}${d.familyName[0] ?? ""}`;
}

export function constructorFromRow(c: Row): F1Constructor {
  return {
    constructorId: (c.constructor_id as string) ?? "",
    name: (c.name as string) ?? "",
    nationality: (c.nationality as string | null) ?? null,
  };
}

export function driverFromRow(d: Row): F1Driver {
  return {
    driverId: (d.driver_id as string) ?? "",
    givenName: (d.given_name as string) ?? "",
    familyName: (d.family_name as string) ?? "",
    code: (d.code as string | null) ?? null,
    nationality: (d.nationality as string | null) ?? null,
    permanentNumber: d.permanent_number != null ? String(d.permanent_number) : null,
    dateOfBirth: (d.date_of_birth as string | null) ?? null,
  };
}

export function driverStandingFromRow(r: Row): DriverStanding {
  const d = (r.drivers as Row) ?? {};
  const c = r.constructors as Row | null;
  return {
    position: String(r.position ?? ""),
    points: String(r.points ?? "0"),
    wins: String(r.wins ?? "0"),
    driver: driverFromRow(d),
    constructor: c ? constructorFromRow(c) : null,
  };
}

export function constructorStandingFromRow(r: Row): ConstructorStanding {
  const c = (r.constructors as Row) ?? {};
  return {
    position: String(r.position ?? ""),
    points: String(r.points ?? "0"),
    wins: String(r.wins ?? "0"),
    constructor: constructorFromRow(c),
  };
}
