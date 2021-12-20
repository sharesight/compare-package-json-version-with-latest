import path from 'path';
import * as core from '@actions/core';

import { compareVersions } from '../src/compare';
import * as VersionImport from '../src/version';

let setOutputSpy;

const config = {
  repository: 'required',
  directory: path.resolve(__dirname, './workspace'),
};

describe('compare', () => {
  beforeEach(() => {
    setOutputSpy = jest.spyOn(core, 'setOutput').mockImplementation();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test.each([undefined, ''])(
    'throws an error with a latest remote version=%p',
    async version => {
      jest
        .spyOn(VersionImport, 'getLatestRemoteVersion')
        .mockImplementation(async () => version);

      await expect(async () => {
        await compareVersions(config);
      }).rejects.toThrow(
        '⚠️ Could not fetch the latest version of this package.'
      );
    }
  );

  test.each([undefined, ''])(
    'throws an error with a package.json version=%p',
    async version => {
      jest
        .spyOn(VersionImport, 'getPackageJsonVersion')
        .mockImplementation(() => version);

      await expect(async () => {
        await compareVersions(config);
      }).rejects.toThrow(
        '⚠️ Could not parse a version out of the package.json.'
      );
    }
  );

  test.each([
    // current, latest, matches, newer, diff
    ['0.1.0', '1.2.3', false, false, 'major'],
    ['2.0.0', '1.2.3', false, true, 'major'],
    ['2.0.0-rc.0', '1.2.3', false, true, 'premajor'],
    ['1.3.0', '1.2.3', false, true, 'minor'],
    ['1.3.0-rc.0', '1.2.3', false, true, 'preminor'],
    ['1.2.2', '1.2.3', false, false, 'patch'],
    ['1.2.2-prerelease.1', '1.2.3-prerelease.2', false, false, 'prepatch'],
    ['1.2.4-prerelease.1', '1.2.3-prerelease.1', false, true, 'prepatch'],
    ['1.2.3-prerelease.1', '1.2.3', false, false, 'prerelease'],
    ['1.2.2', '1.2.2', true, false, null],
    ['1.2.3-prerelease.1', '1.2.3-prerelease.1', true, false, null],
    ['1.2.3-prerelease.1', '1.2.3-prerelease.2', false, false, 'prerelease'],
  ])(
    'sets expected outputs for %p => %p',
    async (current, latest, matches, newer, diff) => {
      jest
        .spyOn(VersionImport, 'getPackageJsonVersion')
        .mockImplementation(() => current);

      jest
        .spyOn(VersionImport, 'getLatestRemoteVersion')
        .mockImplementation(async () => latest);

      await compareVersions(config);

      expect(setOutputSpy).toHaveBeenCalledTimes(3);
      expect(setOutputSpy).toHaveBeenCalledWith('diff', diff);
      expect(setOutputSpy).toHaveBeenCalledWith('matches', matches);
      expect(setOutputSpy).toHaveBeenCalledWith('newer', newer);
    }
  );
});
