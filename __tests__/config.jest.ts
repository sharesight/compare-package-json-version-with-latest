import * as core from '@actions/core';

import { getConfig } from '../src/config';
import type { Config } from '../src/config';

jest.mock('@actions/core');
const getInputMocked = core.getInput as jest.MockedFunction<
  typeof core.getInput
>;

const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];
const originalGitHubRepository = process.env['GITHUB_REPOSITORY'];

process.env['GITHUB_REPOSITORY'] = 'some/repo';

export const baseInputs: Config = {
  repository: 'sharesight/package',
  directory: '../',
};

export const overrideInputs = (inputs: Record<string, any> = {}) => {
  const mockedInputs = { ...baseInputs, ...inputs };
  getInputMocked.mockImplementation(inputName => {
    return mockedInputs[inputName];
  });
};

describe('config', () => {
  beforeEach(() => {
    delete process.env['GITHUB_WORKSPACE'];
    delete process.env['GITHUB_REPOSITORY'];
    jest.resetAllMocks();

    overrideInputs();
  });

  afterAll(() => {
    delete process.env['GITHUB_WORKSPACE'];
    delete process.env['GITHUB_REPOSITORY'];
    process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
    process.env['GITHUB_REPOSITORY'] = originalGitHubRepository;

    jest.restoreAllMocks();
  });

  describe('matches expected', () => {
    test('with baseInput', () => {
      expect(() => getConfig()).not.toThrow();
      expect(getConfig()).toEqual(baseInputs);
    });

    test('all available default values', () => {
      process.env.GITHUB_WORKSPACE = './mocked_directory';
      process.env.GITHUB_REPOSITORY = 'mocked/repo';
      overrideInputs({ directory: undefined, repository: undefined });

      expect(() => getConfig()).not.toThrow();
      expect(getConfig()).toEqual({
        repository: process.env.GITHUB_REPOSITORY,
        directory: process.env.GITHUB_WORKSPACE,
      });
    });
  });

  test.each(['repository', 'directory'])(
    'throws an error when %p is not included',
    name => {
      overrideInputs({ [name]: undefined });

      expect(() => getConfig()).toThrowError(
        `⚠️ The input variable '${name}' is required.`
      );
    }
  );
});
