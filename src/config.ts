import { getInput } from '@actions/core';

export interface Config {
  repository?: string; // defaults to `process.env.GITHUB_REPOSITORY`
  directory?: string; // defaults to `process.env.GITHUB_WORKSPACE`
}

export const getConfig = (): Config => {
  const config: Config = {
    repository: getInput('repository') || process.env.GITHUB_REPOSITORY,
    directory: getInput('directory') || process.env.GITHUB_WORKSPACE,
  };

  ['repository', 'directory'].forEach(key => {
    if (!config[key])
      throw new Error(`⚠️ The input variable '${key}' is required.`);
  });

  return config;
};
