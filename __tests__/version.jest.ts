import { mocked } from 'ts-jest/utils';
import path from 'path';
import fs from 'fs';
import * as core from '@actions/core';
import { graphql } from '@octokit/graphql';

import {
  getLatestRemoteVersion,
  setLatestRemoteVersion,
  getPackageJsonVersion,
  setPackageJsonVersion,
} from '../src/version';

jest.mock('fs');
const readFileSyncMocked = mocked(fs.readFileSync);

jest.mock('@octokit/graphql');
const graphqlMocked = mocked(graphql);
interface HttpError extends Error {
  status?: number;
}

const baseConfig = {
  directory: path.resolve(__dirname, './workspace'),
};

export const mockLatestVersionResponse = version => {
  graphqlMocked.mockImplementation(async () => ({
    repository: {
      packages: {
        nodes: [
          {
            latestVersion: {
              id: '…',
              version,
            },
          },
        ],
      },
    },
  }));
};

let setOutputSpy;
describe('version', () => {
  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    jest.clearAllMocks();
    jest.resetAllMocks();

    setOutputSpy = jest.spyOn(core, 'setOutput').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('get + set LatestRemoteVersion', () => {
    test.each([
      { version: '1.1.1', repository: 'kylorhall/repo' },
      { version: '1.2.3', repository: 'org/repo' },
    ])(
      "pulls a version from Github's GraphQL (%p)",
      async ({ version, repository }) => {
        mockLatestVersionResponse(version);

        expect(graphqlMocked).toHaveBeenCalledTimes(0);
        const latestRemoteVersion = await getLatestRemoteVersion({
          ...baseConfig,
          repository,
        });

        expect(graphqlMocked).toHaveBeenCalledTimes(1);
        expect(graphqlMocked).toHaveBeenCalledWith(
          `
        query getLatestVersion($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            packages(first: 2) {
              nodes {
                latestVersion {
                  id
                  version
                }
              }
            }
          }
        }
      `,
          {
            headers: { authorization: undefined },
            owner: repository.split('/')[0],
            repo: repository.split('/')[1],
          }
        );

        expect(latestRemoteVersion).toEqual(version);
      }
    );

    test('passes env.GITHUB_TOKEN to graphql', async () => {
      process.env.GITHUB_TOKEN = '123abc';
      mockLatestVersionResponse('1.2.3');

      await getLatestRemoteVersion({
        ...baseConfig,
        repository: 'kylorhall/repo',
      });

      expect(graphqlMocked.mock.calls[0][1].headers.authorization).toEqual(
        `token ${process.env.GITHUB_TOKEN}`
      );
    });

    test("throws an error when a latestVersion isn't found", async () => {
      mockLatestVersionResponse('');

      const repository = '@kylorhall/repo';
      const config = { ...baseConfig, repository };
      const error = `⚠️ Found no latestVersion for a repository package on '${repository}'.`;

      // GET:
      await expect(async () => {
        await getLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      // SET:
      await expect(async () => {
        await setLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      expect(setOutputSpy).not.toHaveBeenCalled();
    });

    test('throws an error when >1 package is found', async () => {
      graphqlMocked.mockImplementation(async () => ({
        repository: {
          packages: {
            nodes: [
              {
                // eg. multi-repo: package/core
                latestVersion: {
                  id: '1',
                  version: '1.2.3',
                },
              },
              {
                // eg. multi-repo: package/helpers
                latestVersion: {
                  id: '1',
                  version: '1.2.3',
                },
              },
            ],
          },
        },
      }));

      const repository = '@kylorhall/repo';
      const config = { ...baseConfig, repository };
      const error = `🚧 Found 2 packages on '${repository}', expected only 1.  Monorepo/multiple packages is not supported yet.`;

      // GET:
      await expect(async () => {
        await getLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      // SET:
      await expect(async () => {
        await setLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      expect(setOutputSpy).not.toHaveBeenCalled();
    });

    test('throws an error when you get a 401 with a `GITHUB_TOKEN` set', async () => {
      process.env.GITHUB_TOKEN = 'invalid-token';
      graphqlMocked.mockImplementation(() => {
        const err: HttpError = new Error('Some error message!');
        err.status = 401;
        throw err;
      });

      const config = { ...baseConfig, repository: 'kylorhall/repo' };
      const error =
        '⚠️ 401: Authentication failed! Received error from Github GraphQL: "Some error message!"';

      await expect(async () => {
        await getLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      await expect(async () => {
        await setLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      expect(setOutputSpy).not.toHaveBeenCalled();
    });

    test('throws an error when you get a 401 without a `GITHUB_TOKEN` set', async () => {
      graphqlMocked.mockImplementation(() => {
        const err: HttpError = new Error('Some error message!');
        err.status = 401;
        throw err;
      });

      const config = { ...baseConfig, repository: 'kylorhall/repo' };
      const error =
        '⚠️ 401: Authentication failed! You should provide a `GITHUB_TOKEN` env. Received error from Github GraphQL: "Some error message!"';

      await expect(async () => {
        await getLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      await expect(async () => {
        await setLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      expect(setOutputSpy).not.toHaveBeenCalled();
    });

    test('throws a passed-through error from graphql', async () => {
      graphqlMocked.mockImplementation(() => {
        const err: HttpError = new Error('Some error message!');
        err.status = 500;
        throw err;
      });

      const config = { ...baseConfig, repository: 'kylorhall/repo' };
      const error = 'Some error message!';

      await expect(async () => {
        await getLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      await expect(async () => {
        await setLatestRemoteVersion(config);
      }).rejects.toThrow(error);

      expect(setOutputSpy).not.toHaveBeenCalled();
    });

    test.each(['1.2.3', '4.2.0'])(
      'returns/sets the resolved version (%p)',
      async version => {
        mockLatestVersionResponse(version);

        const config = { ...baseConfig, repository: '@kylorhall/repo' };

        // GET:
        const latestVersion = await getLatestRemoteVersion(config);
        expect(latestVersion).toEqual(version);

        await setLatestRemoteVersion(config);
        expect(setOutputSpy).toHaveBeenCalledWith('latest_version', version);
      }
    );
  });

  describe('get + set PackageJsonVersion', () => {
    test.each([undefined, false, ''])(
      'throws an error when package.json version=%p',
      async version => {
        readFileSyncMocked.mockReturnValue(JSON.stringify({ version }));

        const config = { ...baseConfig, package: 'required' };
        const error = `⚠️ Found no package.json version.`;

        // GET:
        await expect(async () => {
          await getPackageJsonVersion(config);
        }).rejects.toThrow(error);

        // SET:
        await expect(async () => {
          await setPackageJsonVersion(config);
        }).rejects.toThrow(error);

        expect(setOutputSpy).not.toHaveBeenCalled();
      }
    );

    test.each(['1.2.3', '2.0.0-rc.1', 'FOO'])(
      'returns/sets the package.json version=%p',
      async version => {
        readFileSyncMocked.mockReturnValue(JSON.stringify({ version }));

        const config = { ...baseConfig, package: 'required' };

        // GET:
        const result = await getPackageJsonVersion(config);
        expect(result).toEqual(version);

        await setPackageJsonVersion(config);
        expect(setOutputSpy).toHaveBeenCalledWith('current_version', result);
      }
    );
  });
});
