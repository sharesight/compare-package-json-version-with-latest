# compare-package-json-version-with-latest

This Github Action allows us to compare your local `package.json` version with the current registry latest version.

## Example Workflow

```yaml
name: Compare Package and Fail

on: push

jobs:
  typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: "Enforce Version"
        id: enforce
        uses: kylorhall/compare-package-json-version-with-latest@v1.0.0
        with:
          repository: ${{ github.repository }}

      - name: Debug
        if: always()
        run: |
          echo target_version: ${{ steps.enforce.outputs.target_version }}
          echo resolved_version: ${{ steps.enforce.outputs.resolved_version }}
```

# Inputs

| Name      | Description                                       | Example                     | Default Value                  |
| --------- | ------------------------------------------------- | --------------------------- | ------------------------------ |
| package   | The name of the package to check against.         | @kylorhall/package          | **[required]**                 |
| directory | Directory where your `package.json` can be found. | `'../packages/static-site'` | `default=env.GITHUB_WORKSPACE` |

---

# Outputs

| Name            | Description                                              | Type or Example Value                   |
| --------------- | -------------------------------------------------------- | --------------------------------------- | -------- | ---------- | ------- | ---------- | ------- | ---------- | ------------- |
| matches         | If the versions match<br>`1.2.3 === 1.3.0 = false`       | `'true'                                 | 'false'` |
| newer           | If the latest version is newer<br>`1.2.3 < 1.3.0 = true` | `'true'                                 | 'false'` |
| diff            | The diff between versions<br>`1.2.3 < 1.3.0 = 'patch'`   | `null                                   | 'major'  | 'premajor' | 'minor' | 'preminor' | 'patch' | 'prepatch' | 'prerelease'` |
| current_version | The current package.json version                         | `'1.2.3'`, `'1.2.3-prerelease.1'`, etc… |
| latest_version  | The latest package registry version                      | `'1.2.3'`, `'1.2.3-prerelease.1'`, etc… |

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
