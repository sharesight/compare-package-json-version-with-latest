import { setOutput, setFailed } from "@actions/core";

import { setLatestRemoteVersion, setPackageJsonVersion } from "./version";
import { compareVersions } from "./compare";

async function run(): Promise<void> {
  try {
    await setLatestRemoteVersion(); // sets to an output
    await setPackageJsonVersion(); // sets to an output

    await compareVersions();
  } catch (error) {
    setFailed(error.message);
  }
}

// NOTE: The purpose of this file is to execute on load.
export default run();
