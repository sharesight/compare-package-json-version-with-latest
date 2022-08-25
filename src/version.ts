// import { graphql } from '@octokit/graphql';
// import type { GraphQlQueryResponseData } from '@octokit/graphql';

import fs from 'fs';
import path from 'path';

import { setOutput } from '@actions/core';

import { getConfig } from './config';
import type { Config } from './config';
import packageJson from 'package-json';

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

// async function fetchLatestVersion(
//   config: Config = getConfig()
// ): Promise<GraphQlQueryResponseData> {
//   const [owner, repo] = config.repository.split('/');

//   let authorization;
//   if (process.env.GITHUB_TOKEN) {
//     authorization = `token ${process.env.GITHUB_TOKEN}`;
//   }

//   try {
//     return await graphql(
//       `
//         query getLatestVersion($owner: String!, $repo: String!) {
//           repository(owner: $owner, name: $repo) {
//             packages(first: 2) {
//               nodes {
//                 latestVersion {
//                   id
//                   version
//                 }
//               }
//             }
//           }
//         }
//       `,
//       {
//         owner,
//         repo,
//         headers: {
//           authorization,
//         },
//       }
//     );
//   } catch (err) {
//     if (err.status === 401) {
//       let message = `⚠️ ${err.status}: Authentication failed!`;
//       if (!authorization) {
//         message += ' You should provide a `GITHUB_TOKEN` env.';
//       }

//       throw new Error(
//         `${message} Received error from Github GraphQL: "${err.message}"`
//       );
//     }

//     throw err;
//   }
// }

export async function getLatestRemoteVersion(
  config: Config = getConfig()
): Promise<string> {
  const response = await packageJson('@sharesight/react');
  console.log("@@@response", response);

  if (Object.keys(response.versions).length > 1) {
    throw new Error(
      `🚧 Found ${Object.keys(response.versions).length} packages on '${config.repository}', expected only 1.  Monorepo/multiple packages is not supported yet.`
    );
  }

  const version = response.versions['version'].version;

  if (!version) {
    throw new Error(
      `⚠️ Found no latestVersion for a repository package on '${config.repository}'.`
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
