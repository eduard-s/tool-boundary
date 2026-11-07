# Publish ToolBoundary

The Python and npm packages have independent versions and release tags. The commands in this guide use version `0.1.0` as an example. Change the version before each later release.

## Before the first release

1. Push this repository to `eduard-s/tool-boundary` on GitHub.
2. Make sure that you control the npm scope `@eduard-s`. Change `name` in `packages/typescript/package.json` if your npm account uses another scope.
3. Examine the package names on [npm](https://www.npmjs.com/) and [PyPI](https://pypi.org/). A registry search does not reserve a name.
4. Create a GitHub environment named `pypi`. Set its release protection rules for your account.
5. Make sure that the version in each package matches its release tag.

## Local release tests

Run these commands from the repository root:

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

The Python environment command above creates a package-local `.venv`. The root `.gitignore` excludes it.

## First npm release

npm needs a package record before its trusted publisher settings are available. Sign in to the npm account that owns the scope. Run these commands from `packages/typescript`:

```sh
npm whoami
npm run build
npm pack --dry-run
npm publish --access public
```

This manual command uploads the first public npm release. The name and version must match `package.json`. An npm version cannot be replaced after publication.

After the first release, open the package's **Settings → Trusted publishing** page on npm. Add GitHub Actions with owner `eduard-s`, repository `tool-boundary`, and workflow filename `publish-npm.yml`. Allow direct `npm publish`. The workflow uses short-lived OIDC credentials. The [npm guide](https://docs.npmjs.com/trusted-publishers/) describes the exact settings.

For later npm releases, change the package version and push a matching tag:

```sh
git tag node-v0.1.1
git push origin node-v0.1.1
```

The [`publish-npm.yml`](.github/workflows/publish-npm.yml) workflow runs tests, makes the package, and publishes it.

## First PyPI release

Create a [pending PyPI trusted publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/). Set the project name to `tool-boundary`. Set the GitHub owner to `eduard-s`, repository to `tool-boundary`, workflow filename to `publish-python.yml`, and environment to `pypi`.

PyPI does not reserve the name when you make the pending publisher. Push the matching tag after the workflow and environment exist:

```sh
git tag python-v0.1.0
git push origin python-v0.1.0
```

The [`publish-python.yml`](.github/workflows/publish-python.yml) workflow makes a wheel and source archive. It uploads both through PyPI's trusted publisher. The [PyPI guide](https://docs.pypi.org/trusted-publishers/using-a-publisher/) describes the OIDC process.

For later Python releases, change the version in `packages/python/pyproject.toml`. Push a matching `python-v...` tag.

## After publication

Examine the registry pages. Install each package in a new project:

```sh
python3 -m venv /tmp/tool-boundary-install
/tmp/tool-boundary-install/bin/python -m pip install 'tool-boundary[mcp-v1]'
/tmp/tool-boundary-install/bin/python -c 'import tool_boundary'

npm install @eduard-s/tool-boundary
```

The npm package needs the SDK for the adapter that you import. See [`packages/typescript/README.md`](packages/typescript/README.md).
