import { setOutput } from '@actions/core';

import semver from 'semver';
import type { SemVer, ReleaseType } from 'semver';

import { getConfig } from './config';
import type { Config } from './config';

import { getPackageJsonVersion, getLatestRemoteVersion } from './version';

export async function compareVersions(
  config: Config = getConfig()
): Promise<void> {
  let currentVersion: SemVer = semver.parse(getPackageJsonVersion(config));
  if (!currentVersion?.version) {
    throw new Error(`⚠️ Could not parse a version out of the package.json.`);
  }

  let latestVersion: SemVer = semver.parse(
    await getLatestRemoteVersion(config)
  );

  if (!latestVersion?.version) {
    throw new Error(`⚠️ Could not fetch the latest version of this package.`);
  }

  const matches: boolean = semver.eq(
    currentVersion.version,
    latestVersion.version
  );
  setOutput('matches', matches);

  const newer: boolean = semver.gt(
    currentVersion.version,
    latestVersion.version
  );
  setOutput('newer', newer);

  // Eg. 'major' | 'premajor' | 'minor' | 'preminor' | 'patch' | 'prepatch' | 'prerelease';
  const diff: ReleaseType | null = semver.diff(
    currentVersion.version,
    latestVersion.version
  );
  setOutput('diff', diff);
}
