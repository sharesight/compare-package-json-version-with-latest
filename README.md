# compare-package-json-version-with-latest

This Github Action allows us to compare your local `package.json` version with a repository's Package Registry's latest version.

## Example Workflow

```yaml
name: Compare Packages

on: push

jobs:
  compare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: "Compare Version"
        id: compare
        uses: kylorhall/compare-package-json-version-with-latest@v1.1.0
        with:
          repository: ${{ github.repository }}

      - name: Debug
        run: |
          echo current_version: ${{ steps.compare.outputs.current_version }}
          echo latest_version: ${{ steps.compare.outputs.latest_version }}
          echo matches?: ${{ steps.compare.outputs.matches }}
          echo newer?: ${{ steps.compare.outputs.newer }}
          echo diff: ${{ steps.compare.outputs.diff }}

      - name: Fail if not newer
        if: steps.compare.outputs.newer != 'true'
        run: |
          echo Version was not newer: ${{ steps.compare.outputs.current_version }} vs. ${{ steps.compare.outputs.latest_version }}
          exit 1
```

# Inputs

| Name       | Description                                                       | Example                     | Default Value           |
| ---------- | ----------------------------------------------------------------- | --------------------------- | ----------------------- |
| repository | The name of the repository to check for a latest package against. | `'@kylorhall/package'`      | `env.GITHUB_REPOSITORY` |
| directory  | Directory where your `package.json` can be found.                 | `'../packages/static-site'` | `env.GITHUB_WORKSPACE`  |

---

# Outputs

| Name            | Description                                              | Example Values                                                                       |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| matches         | If the versions match<br>`1.2.3 === 1.3.0 = false`       | `'true', 'false'`                                                                    |
| newer           | If the latest version is newer<br>`1.2.3 < 1.3.0 = true` | `'true', 'false'`                                                                    |
| diff            | The diff between versions<br>`1.2.3 < 1.3.0 = 'patch'`   | `null , 'major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease'` |
| current_version | The current package.json version                         | `'1.2.3'`, `'1.2.3-prerelease.1'`, etc…                                              |
| latest_version  | The latest package registry version                      | `'1.2.3'`, `'1.2.3-prerelease.1'`, etc…                                              |

---

# Development of this Action

## Start Development

```bash
yarn install
code .
yarn jest:tdd
```

## Release

Manually build a New Release: [here](https://github.com/kylorhall/compare-package-json-version-with-latest/releases/new)

1. Deicde on a semver like `v1.2.3`
2. :warning: Point the release to the correct commit (not _main_). `@latest` isn't used.
3. Bump this version in `package.json` file—just for the sake of it.
4. Bump this version in `README.md` file.
