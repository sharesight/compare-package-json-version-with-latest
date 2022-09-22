import path from 'path';
import fs from 'fs';
import * as core from '@actions/core';
import { Octokit } from '@octokit/core';

import {
  getLatestRemoteVersion,
  setLatestRemoteVersion,
  getPackageJsonVersion,
  setPackageJsonVersion,
} from '../src/version';

jest.mock('fs', () => ({
  promises: { access: jest.fn() },
  readFileSync: jest.fn(),
}));
const readFileSyncMocked = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

jest.mock('@octokit/core');
const octokitMocked = Octokit as jest.MockedClass<typeof Octokit>;

interface HttpError extends Error {
  status?: number;
}

const baseConfig = {
  directory: path.resolve(__dirname, './workspace'),
};

const mockLatestVersionResponse = version => {
  // @ts-expect-error -- Since it's a Mocked class it expects all the other properties that the instantiated Octokit defines.
  octokitMocked.mockImplementation(() => {
    return {
      request: jest.fn().mockImplementation(async () => {
        return { data: { tag_name: `v${version}` } };
      }),
    };
  });
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
      { version: '1.1.1', repository: 'sharesight/repo' },
      { version: '1.2.3', repository: 'org/repo' },
    ])("pulls a version from Github's Octokit.request (%p)", async ({ version, repository }) => {
      mockLatestVersionResponse(version);
      expect(octokitMocked).toHaveBeenCalledTimes(0);
      const latestRemoteVersion = await getLatestRemoteVersion({
        ...baseConfig,
        repository,
      });

      expect(octokitMocked).toHaveBeenCalledTimes(1);
      expect(octokitMocked).toHaveBeenCalledWith({ auth: undefined });

      expect(latestRemoteVersion).toEqual(version);
    });

    test('passes env.GITHUB_TOKEN to Octokit', async () => {
      process.env.GITHUB_TOKEN = '123abc';
      mockLatestVersionResponse('1.2.3');

      await getLatestRemoteVersion({
        ...baseConfig,
        repository: 'sharesight/repo',
      });

      expect(octokitMocked.mock.calls[0][0].auth).toEqual(`token ${process.env.GITHUB_TOKEN}`);
    });

    test("throws an error when a latest version isn't found", async () => {
      mockLatestVersionResponse('');

      const repository = '@sharesight/repo';
      const config = { ...baseConfig, repository };
      const error = `⚠️ Found no latest version for a repository package on '${repository}'.`;

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
    const config = { ...baseConfig, repository: 'sharesight/repo' };
    const error =
      '⚠️ 401: Authentication failed! Received error from Github Octokit.request: "Some error message!"';

    octokitMocked.mockImplementation(() => {
      const err: HttpError = new Error(error);
      err.status = 401;
      throw err;
    });

    await expect(async () => {
      await getLatestRemoteVersion(config);
    }).rejects.toThrow(error);

    await expect(async () => {
      await setLatestRemoteVersion(config);
    }).rejects.toThrow(error);

    expect(setOutputSpy).not.toHaveBeenCalled();
  });

  test('throws an error when you get a 401 without a `GITHUB_TOKEN` set', async () => {
    const config = { ...baseConfig, repository: 'sharesight/repo' };
    const error =
      '⚠️ 401: Authentication failed! You should provide a `GITHUB_TOKEN` env. Received error from Github Octokit: "Some error message!"';

    octokitMocked.mockImplementation(() => {
      const err: HttpError = new Error(error);
      err.status = 401;
      throw err;
    });

    await expect(async () => {
      await getLatestRemoteVersion(config);
    }).rejects.toThrow(error);

    await expect(async () => {
      await setLatestRemoteVersion(config);
    }).rejects.toThrow(error);

    expect(setOutputSpy).not.toHaveBeenCalled();
  });

  test('throws a passed-through error from Octokit.request', async () => {
    const config = { ...baseConfig, repository: 'sharesight/repo' };
    const error = 'Some error message!';

    octokitMocked.mockImplementation(() => {
      const err: HttpError = new Error('Some error message!');
      err.status = 500;
      throw err;
    });

    await expect(async () => {
      await getLatestRemoteVersion(config);
    }).rejects.toThrow(error);

    await expect(async () => {
      await setLatestRemoteVersion(config);
    }).rejects.toThrow(error);

    expect(setOutputSpy).not.toHaveBeenCalled();
  });

  test.each(['1.2.3', '4.2.0'])('returns/sets the resolved version (%p)', async version => {
    mockLatestVersionResponse(version);

    const config = { ...baseConfig, repository: '@sharesight/repo' };

    const latestVersion = await getLatestRemoteVersion(config);
    expect(latestVersion).toEqual(version);

    await setLatestRemoteVersion(config);
    expect(setOutputSpy).toHaveBeenCalledWith('latest_version', version);
  });
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
