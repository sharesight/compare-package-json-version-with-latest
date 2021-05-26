import latestVersion from "latest-version";

import fs from "fs";
import path from "path";

import { setOutput } from "@actions/core";

import { getConfig } from "./config";
import type { Config } from "./config";

interface PackageJson {
  version: string;
}

export function getPackageJsonVersion(config: Config = getConfig()): string {
  const packageJsonBuffer: Buffer = fs.readFileSync(
    path.join(config.directory, "package.json")
  );
  const packageJson: PackageJson = JSON.parse(
    packageJsonBuffer.toString("utf8")
  );

  const version = packageJson.version;

  if (!version) {
    throw new Error(`⚠️ Found no package.json version.`);
  }

  return version;
}

export function setPackageJsonVersion(config: Config = getConfig()): void {
  const version: string = getPackageJsonVersion(config);
  setOutput("current_version", version);
}

export async function getLatestRemoteVersion(
  config: Config = getConfig()
): Promise<string> {
  const version = await latestVersion(config.package);

  if (!version) {
    throw new Error(
      `⚠️ Found no latest remote version for '${config.package}'.`
    );
  }

  return version;
}

export async function setLatestRemoteVersion(
  config: Config = getConfig()
): Promise<void> {
  const version: string = await getLatestRemoteVersion(config);
  setOutput("latest_version", version);
}
