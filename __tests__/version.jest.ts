import { mocked } from "ts-jest/utils";
import path from "path";
import fs from "fs";
import * as core from "@actions/core";
import latestVersion from "latest-version";

import {
  getLatestRemoteVersion,
  setLatestRemoteVersion,
  getPackageJsonVersion,
  setPackageJsonVersion,
} from "../src/version";
import type { Config } from "../src/config";

const baseConfig = {
  directory: path.resolve(__dirname, "./workspace"),
};

jest.mock("fs");
const readFileSyncMocked = mocked(fs.readFileSync);

jest.mock("latest-version");
const latestVersionMocked = mocked(latestVersion);
latestVersionMocked.mockImplementation(async () => "1.2.3");

let setOutputSpy;
describe("version", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    setOutputSpy = jest.spyOn(core, "setOutput").mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("get + set LatestRemoteVersion", () => {
    test.each(["a", "b"])(
      "throws an error when package is not found  (%p)",
      async (pkg) => {
        latestVersionMocked.mockImplementation(async () => undefined);

        const config = { ...baseConfig, package: pkg };
        const error = `⚠️ Found no latest remote version for '${pkg}'.`;

        // GET:
        await expect(async () => {
          await getLatestRemoteVersion(config);
        }).rejects.toThrow(error);

        // SET:
        await expect(async () => {
          await setLatestRemoteVersion(config);
        }).rejects.toThrow(error);

        expect(setOutputSpy).not.toHaveBeenCalled();
      }
    );

    test.each(["a", "b"])(
      "returns/sets the resolved version (%p)",
      async (pkg) => {
        const mockedVersion = "99.42.1";
        latestVersionMocked.mockImplementation(async () => mockedVersion);
        const config = { ...baseConfig, package: pkg };

        // GET:
        const version = await getLatestRemoteVersion(config);
        expect(version).toEqual(mockedVersion);

        await setLatestRemoteVersion(config);
        expect(setOutputSpy).toHaveBeenCalledWith(
          "latest_version",
          mockedVersion
        );
      }
    );
  });

  describe("get + set PackageJsonVersion", () => {
    test.each([undefined, false, ""])(
      "throws an error when package.json version=%p",
      async (version) => {
        readFileSyncMocked.mockReturnValue(JSON.stringify({ version }));

        const config = { ...baseConfig, package: "required" };
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

    test.each(["1.2.3", "2.0.0-rc.1", "FOO"])(
      "returns/sets the package.json version=%p",
      async (version) => {
        readFileSyncMocked.mockReturnValue(JSON.stringify({ version }));

        const config = { ...baseConfig, package: "required" };

        // GET:
        const result = await getPackageJsonVersion(config);
        expect(result).toEqual(version);

        await setPackageJsonVersion(config);
        expect(setOutputSpy).toHaveBeenCalledWith("current_version", result);
      }
    );
  });
});
