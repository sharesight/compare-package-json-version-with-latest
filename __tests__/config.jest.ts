import * as core from "@actions/core";

import { getConfig } from "../src/config";
import type { Config } from "../src/config";

const originalGitHubWorkspace = process.env["GITHUB_WORKSPACE"];

export const baseInputs: Config = {
  package: "semver",
  directory: "../",
};

let getInputSpy;
export const mockedGetInput = (name: string, inputs = baseInputs) =>
  inputs[name];
export const overrideInputs = (inputs) => {
  jest.spyOn(core, "getInput").mockClear();
  getInputSpy = jest.spyOn(core, "getInput").mockImplementation((inputName) => {
    return mockedGetInput(inputName, { ...baseInputs, ...inputs });
  });
};

describe("config", () => {
  beforeEach(() => {
    delete process.env["GITHUB_WORKSPACE"];
    jest.resetAllMocks();

    getInputSpy = jest
      .spyOn(core, "getInput")
      .mockImplementation((name) => mockedGetInput(name));
  });

  afterAll(() => {
    delete process.env["GITHUB_WORKSPACE"];
    process.env["GITHUB_WORKSPACE"] = originalGitHubWorkspace;

    jest.restoreAllMocks();
  });

  describe("matches expected", () => {
    test("with baseInput", () => {
      expect(() => getConfig()).not.toThrow();
      expect(getConfig()).toEqual(baseInputs);
    });

    test("all available default values", () => {
      process.env.GITHUB_WORKSPACE = "./mocked_directory";
      overrideInputs({ directory: undefined });

      expect(() => getConfig()).not.toThrow();
      expect(getConfig()).toEqual({
        package: baseInputs.package,
        directory: process.env.GITHUB_WORKSPACE,
      });
    });
  });

  test.each(["package", "directory"])(
    "throws an error when %p is not included",
    (name) => {
      overrideInputs({ [name]: undefined });

      expect(() => getConfig()).toThrowError(
        `⚠️ The input variable '${name}' is required.`
      );
    }
  );
});
