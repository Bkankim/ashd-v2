import { Polar } from "@polar-sh/sdk";

let _polar: Polar | null = null;

export function getPolar(): Polar {
  if (!_polar) {
    if (!process.env.POLAR_ACCESS_TOKEN) {
      throw new Error("POLAR_ACCESS_TOKEN is not set");
    }
    _polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });
  }
  return _polar;
}
