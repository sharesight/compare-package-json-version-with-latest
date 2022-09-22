import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';
import { Octokit } from '@octokit/core';

import type { Config } from '../src/config';

const LATEST_VERSION = '1.2.3';
const CURRENT_VERSION = '1.2.3-workspace.42';

jest.mock('fs', () => ({
  promises: { access: jest.fn() },
  readFileSync: jest.fn(),
}));
const readFileSyncMocked = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;

jest.mock('@octokit/core');
const octokitMocked = Octokit as jest.MockedClass<typeof Octokit>;

jest.mock('@actions/core');
const getInputMocked = core.getInput as jest.MockedFunction<
  typeof core.getInput
>;

export const mockLatestVersionResponse = version => {
  // @ts-expect-error -- Since it's a Mocked class it expects all the other properties that the instantiated Octokit defines.
  octokitMocked.mockImplementation(() => {
    return {
      request: jest.fn().mockImplementation(async () => {
        return { data: { tag_name: `v${version}` } };
      }),
    };
  });
};

export const baseInputs: Config = {
  directory: path.resolve(__dirname, './workspace'),
  repository: 'sharesight/package',
};

let setFailedSpy;
let setOutputSpy;
setOutputSpy = jest.spyOn(core, 'setOutput').mockImplementation();

export const overrideInputs = (inputs: Record<string, any> = {}) => {
  const mockedInputs = { ...baseInputs, ...inputs };
  getInputMocked.mockImplementation(inputName => {
    return mockedInputs[inputName];
  });
};

describe('run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    readFileSyncMocked.mockReturnValue(
      JSON.stringify({ version: CURRENT_VERSION })
    );

    mockLatestVersionResponse(LATEST_VERSION);

    overrideInputs();

    setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation();
    setOutputSpy = jest.spyOn(core, 'setOutput').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('normal scenario: sets all outputs as expected', async () => {
    // NOTE: This runs on load, this is how you do that…
    let promise;
    jest.isolateModules(() => {
      promise = require('../src/run').default;
    });

    await promise;

    expect(setFailedSpy).toHaveBeenCalledTimes(0);

    expect(setOutputSpy).toHaveBeenCalledTimes(5);
    expect(setOutputSpy).toHaveBeenCalledWith('latest_version', LATEST_VERSION);
    expect(setOutputSpy).toHaveBeenCalledWith('matches', false);
    expect(setOutputSpy).toHaveBeenCalledWith('newer', false);
    expect(setOutputSpy).toHaveBeenCalledWith('diff', 'prerelease');
    expect(setOutputSpy).toHaveBeenCalledWith(
      'current_version',
      CURRENT_VERSION
    );
  });

  test("'newer' scenario: sets all outputs as expected", async () => {
    mockLatestVersionResponse('1.2.2');

    // NOTE: This runs on load, this is how you do that…
    let promise;
    jest.isolateModules(() => {
      promise = require('../src/run').default;
    });

    await promise;

    expect(setFailedSpy).toHaveBeenCalledTimes(0);

    expect(setOutputSpy).toHaveBeenCalledTimes(5);
    expect(setOutputSpy).toHaveBeenCalledWith('latest_version', '1.2.2');
    expect(setOutputSpy).toHaveBeenCalledWith('matches', false);
    expect(setOutputSpy).toHaveBeenCalledWith('newer', true);
    expect(setOutputSpy).toHaveBeenCalledWith('diff', 'prepatch');
    expect(setOutputSpy).toHaveBeenCalledWith(
      'current_version',
      CURRENT_VERSION
    );
  });

  test.each(['2.2.2', '1.1.1', '0.2.3-foo.1'])(
    "'matches' scenario: sets all outputs as expected",
    async version => {
      readFileSyncMocked.mockReturnValue(JSON.stringify({ version }));
      mockLatestVersionResponse(version);

      // NOTE: This runs on load, this is how you do that…
      let promise;
      jest.isolateModules(() => {
        promise = require('../src/run').default;
      });

      await promise;

      expect(setFailedSpy).toHaveBeenCalledTimes(0);

      expect(setOutputSpy).toHaveBeenCalledTimes(5);
      expect(setOutputSpy).toHaveBeenCalledWith('latest_version', version);
      expect(setOutputSpy).toHaveBeenCalledWith('matches', true);
      expect(setOutputSpy).toHaveBeenCalledWith('newer', false);
      expect(setOutputSpy).toHaveBeenCalledWith('diff', null);
      expect(setOutputSpy).toHaveBeenCalledWith('current_version', version);
    }
  );

  test.each([undefined, false, ''])(
    'failing scenario: missing/invalid local package.jsion version=%p',
    async version => {
      readFileSyncMocked.mockReturnValue(JSON.stringify({ version }));

      // NOTE: This runs on load, this is how you do that…
      let promise;
      jest.isolateModules(() => {
        promise = require('../src/run').default;
      });

      await promise;

      expect(setFailedSpy).toHaveBeenCalledTimes(1);
      expect(setFailedSpy).toHaveBeenCalledWith(
        `⚠️ Found no package.json version.`
      );

      expect(setOutputSpy).toHaveBeenCalledTimes(1);
      expect(setOutputSpy).toHaveBeenCalledWith(
        'latest_version',
        LATEST_VERSION
      );
    }
  );
  test('failing scenario: missing remote latest package version=%p',
    async () => {
      mockLatestVersionResponse(''); // passes an empty string as a version value.

      // NOTE: This runs on load, this is how you do that…
      let promise;
      jest.isolateModules(() => {
        promise = require('../src/run').default;
      });

      await promise;

      expect(setFailedSpy).toHaveBeenCalledTimes(1);
      expect(setFailedSpy).toHaveBeenCalledWith(
        `⚠️ Found no latest version for a repository package on 'sharesight/package'.`
      );

      expect(setOutputSpy).toHaveBeenCalledTimes(0);
    }
  );

  test.each(['repository', 'directory'])(
    'failing scenario: missing required input %p',
    key => {
      overrideInputs({
        repository: 'required',
        directory: 'required',
        [key]: undefined,
      });

      // NOTE: This runs on load, this is how you do that…
      // jest.resetModules();
      jest.isolateModules(() => {
        require('../src/run');
      });

      expect(setFailedSpy).toHaveBeenCalledTimes(1);
      expect(setFailedSpy).toHaveBeenCalledWith(
        `⚠️ The input variable '${key}' is required.`
      );

      expect(setOutputSpy).toHaveBeenCalledTimes(0);
    }
  );
});
