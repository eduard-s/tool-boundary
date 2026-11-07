# Publish ToolBoundary

The Python and npm packages have separate versions and release tags. In this guide, commands use version `0.1.0`. Change the version before each later release.

## Before the first release

1. Push this repository to `eduard-s/tool-boundary` on GitHub.
2. Make sure that your npm account controls the `@eduard-s` scope.
3. If your npm account uses another scope, change `name` in `packages/typescript/package.json`.
4. Examine the package names on [npm](https://www.npmjs.com/) and [PyPI](https://pypi.org/). A registry search does not reserve a name.
5. Create a GitHub environment named `pypi`.
6. Set the environment release protection rules for your account.
7. Make sure that the version in each package matches its release tag.

## Local release tests

From the repository root, run these commands:

```sh
cd packages/python
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/ruff check .
.venv/bin/pytest -q
.venv/bin/python -m build

cd ../typescript
npm ci
npm run typecheck
npm test
npm run build
npm audit --omit=dev
npm pack --dry-run
```

The Python commands make `.venv` in the package directory. The root `.gitignore` excludes it.

## First npm release

npm needs a package record before you can set a trusted publisher. Sign in to the account that owns `@eduard-s`. From `packages/typescript`, run these commands:

```sh
npm whoami
npm run build
npm pack --dry-run
npm publish --access public
```

The manual `npm publish` command uploads the first public release. The `name` and `version` values must match `package.json`. You cannot replace a published npm version.

After the first release, open the package's **Settings → Trusted publishing** page on npm. Add GitHub Actions with owner `eduard-s`, repository `tool-boundary`, and workflow filename `publish-npm.yml`. Allow direct `npm publish`. The workflow uses OIDC credentials with a short lifetime. Read the [npm guide](https://docs.npmjs.com/trusted-publishers/) for the exact settings.

For later npm releases, change the package version. Push a tag that matches the version:

```sh
git tag node-v0.1.1
git push origin node-v0.1.1
```

The [`publish-npm.yml`](.github/workflows/publish-npm.yml) workflow runs tests, makes the package, and publishes it.

## First PyPI release

Create a [pending PyPI trusted publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/). Set the project name to `tool-boundary`. Set the GitHub owner to `eduard-s`. Set the repository to `tool-boundary`. Set the workflow filename to `publish-python.yml`. Set the environment to `pypi`.

PyPI does not reserve the name when you make the pending publisher. After the workflow and environment exist, push the matching tag:

```sh
git tag python-v0.1.0
git push origin python-v0.1.0
```

The [`publish-python.yml`](.github/workflows/publish-python.yml) workflow makes a wheel and source archive. It uploads both through the PyPI trusted publisher. Read the [PyPI guide](https://docs.pypi.org/trusted-publishers/using-a-publisher/) for the OIDC process.

For later Python releases, change the version in `packages/python/pyproject.toml`. Push a `python-v...` tag that matches the version.

## After publication

Examine the registry pages. Install each package in a new project:

```sh
python3 -m venv /tmp/tool-boundary-install
/tmp/tool-boundary-install/bin/python -m pip install 'tool-boundary[mcp-v1]'
/tmp/tool-boundary-install/bin/python -c 'import tool_boundary'

npm install @eduard-s/tool-boundary
```

The npm package needs the SDK for the adapter that you import. Read [`packages/typescript/README.md`](packages/typescript/README.md).
