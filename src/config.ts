import { getInput } from "@actions/core";

export interface Config {
  package: string;
  directory?: string; // defaults to `process.env.GITHUB_WORKSPACE`
}

const assertRequired = (config: Config, key: string): void => {
  if (!config[key])
    throw new Error(`⚠️ The input variable '${key}' is required.`);
};

export const getConfig = (): Config => {
  const config: Config = {
    package: getInput("package"),
    directory: getInput("directory") || process.env.GITHUB_WORKSPACE,
  };

  // These are required strings.
  assertRequired(config, "package");
  assertRequired(config, "directory");

  return config;
};
