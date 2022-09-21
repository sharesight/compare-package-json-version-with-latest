import { Octokit } from '@octokit/core';

import fs from 'fs';
import path from 'path';

import { setOutput } from '@actions/core';

import { getConfig } from './config';

import type { Config } from './config';

interface PackageJson {
  version: string;
}

export function getPackageJsonVersion(config: Config = getConfig()): string {
  const packageJsonBuffer: Buffer = fs.readFileSync(
    path.join(config.directory, 'package.json')
  );
  const packageJson: PackageJson = JSON.parse(
    packageJsonBuffer.toString('utf8')
  );

  const version = packageJson.version;

  if (!version) {
    throw new Error(`⚠️ Found no package.json version.`);
  }

  return version;
}

export function setPackageJsonVersion(config: Config = getConfig()): void {
  const version: string = getPackageJsonVersion(config);
  setOutput('current_version', version);
}

async function fetchLatestVersion(
  config: Config = getConfig()
) {
  const [owner, repo] = config.repository.split('/');

  let authorization;
  if (process.env.GITHUB_TOKEN) {
    authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const octokit = new Octokit({
    auth: authorization
  })

  try {
    return await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
      owner,
      repo
    })

  } catch (err) {
    if (err.status === 401) {
      let message = `⚠️ ${err.status}: Authentication failed!`;
      if (!authorization) {
        message += ' You should provide a `GITHUB_TOKEN` env.';
      }

      throw new Error(
        `${message} Received error from Github Octokit request: "${err.message}"`
      );
    }

    throw err;
  }
}

export async function getLatestRemoteVersion(
  config: Config = getConfig()
): Promise<string> {
  const { data } = await fetchLatestVersion(config);

  const version = data.tag_name;

  if (!version) {
    throw new Error(
      `⚠️ Found no latest version for a repository package on '${config.repository}'.`
    );
  }

  return version;
}

export async function setLatestRemoteVersion(
  config: Config = getConfig()
): Promise<void> {
  const version: string = await getLatestRemoteVersion(config);
  setOutput('latest_version', version);
}
