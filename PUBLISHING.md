# Publish ToolBoundary

The Python and npm packages have separate versions and release tags. The npm commands use version `0.1.0`. The Python commands use version `0.1.1`. Change each version for later releases.

## Before the first release

1. Push this repository to `eduard-s/tool-boundary` on GitHub.
2. Make sure that your npm account controls the `@esmirnov.ai` scope.
3. If your npm account uses another scope, change `name` in `packages/typescript/package.json`.
4. Examine the package names on [npm](https://www.npmjs.com/) and [PyPI](https://pypi.org/). A registry search does not reserve a name.
5. Create a GitHub environment named `pypi`.
6. Set the environment release protection rules for your account.
7. Make sure that the version in each package matches its release tag.

## Local release tests

From the repository root, run the Python commands:

```sh
cd packages/python
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/ruff check .
.venv/bin/pytest -q
.venv/bin/python -m build
```

From the repository root, run the Node.js commands:

```sh
cd packages/typescript
npm ci
npm run typecheck
npm test
npm run build
npm audit --omit=dev
npm pack --dry-run
```

The Python commands make `.venv` in the package directory. The root `.gitignore` excludes it.

## First npm release

npm needs a package record before you can set a trusted publisher. Sign in to the account that owns `@esmirnov.ai`. From `packages/typescript`, run these commands:

```sh
npm login
npm whoami
npm run build
npm pack --dry-run
npm publish --access public
```

The manual `npm publish` command uploads the first public release. The `name` and `version` values must match `package.json`. You cannot replace a published npm version. Do not push `node-v0.1.0` after this manual release. That tag starts a second publication of the same version.

Before the next npm release, open the package's **Settings → Trusted publishing** page on npm. Add GitHub Actions with owner `eduard-s`, repository `tool-boundary`, and workflow filename `publish-npm.yml`. Allow direct `npm publish`. Publish through the workflow within two days of this configuration. If this period ends, delete the expired connection and make a new one. Read the [npm guide](https://docs.npmjs.com/trusted-publishers/) for the exact settings.

The npm workflow has no GitHub environment. Leave the npm environment field empty.

For later npm releases, change the package version. Push a tag that matches the version:

```sh
git tag node-v0.1.1
git push origin node-v0.1.1
```

The [`publish-npm.yml`](.github/workflows/publish-npm.yml) workflow runs tests, makes the package, and publishes it.

## First PyPI release

Create a [pending PyPI trusted publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/). Set the project name to `tool-boundary-py`. Set the GitHub owner to `eduard-s`. Set the repository to `tool-boundary`. Set the workflow filename to `publish-python.yml`. Set the environment to `pypi`.

PyPI does not reserve the name when you make the pending publisher. After the workflow and environment exist, push the matching tag:

```sh
git tag python-v0.1.1
git push origin python-v0.1.1
```

The [`publish-python.yml`](.github/workflows/publish-python.yml) workflow makes a wheel and source archive. It uploads both through the PyPI trusted publisher. Read the [PyPI guide](https://docs.pypi.org/trusted-publishers/using-a-publisher/) for the OIDC process.

For later Python releases, change the version in `packages/python/pyproject.toml`. Push a `python-v...` tag that matches the version.

## After publication

Examine the registry pages. From the repository root, install the Python package in a new environment:

```sh
python3 -m venv .venv-published
.venv-published/bin/python -m pip install 'tool-boundary-py[mcp-v1]'
.venv-published/bin/python -c 'import tool_boundary'
```

In a new Node.js project, run `npm install @esmirnov.ai/tool-boundary`.

The npm package needs the SDK for the adapter that you import. Read [`packages/typescript/README.md`](packages/typescript/README.md).
