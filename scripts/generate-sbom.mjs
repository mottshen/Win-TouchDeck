import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
function runPnpm(args) {
  const command = process.platform === 'win32' ? process.env.ComSpec : 'pnpm'
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm.cmd', ...args] : args
  return JSON.parse(execFileSync(command, commandArgs, { cwd: root, encoding: 'utf8' }))
}

const licenses = runPnpm(['licenses', 'list', '--prod', '--json'])
const electronTree = runPnpm(['list', 'electron', '--depth', '0', '--json'])
const electronVersion = electronTree[0]?.devDependencies?.electron?.version

if (!electronVersion) throw new Error('Unable to resolve the installed Electron version')

const components = []
for (const [licenseId, packages] of Object.entries(licenses)) {
  for (const pkg of packages) {
    for (const version of pkg.versions) {
      components.push({
        type: 'library',
        'bom-ref': `pkg:npm/${pkg.name}@${version}`,
        name: pkg.name,
        version,
        licenses: [{ license: { id: licenseId } }],
        purl: `pkg:npm/${pkg.name}@${version}`,
        externalReferences: pkg.homepage
          ? [{ type: 'website', url: pkg.homepage }]
          : undefined,
      })
    }
  }
}

components.push({
  type: 'framework',
  'bom-ref': `pkg:npm/electron@${electronVersion}`,
  name: 'electron',
  version: electronVersion,
  licenses: [{ license: { id: 'MIT' } }],
  purl: `pkg:npm/electron@${electronVersion}`,
  externalReferences: [{ type: 'website', url: 'https://www.electronjs.org/' }],
  properties: [
    {
      name: 'win-touchdeck:notice',
      value: 'The packaged Electron runtime includes LICENSE and LICENSES.chromium.html with transitive notices.',
    },
  ],
})

components.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

const appRef = `pkg:npm/${packageJson.name}@${packageJson.version}`
const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  version: 1,
  metadata: {
    component: {
      type: 'application',
      'bom-ref': appRef,
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      purl: appRef,
    },
    tools: {
      components: [
        {
          type: 'application',
          name: 'Win-TouchDeck SBOM generator',
          version: packageJson.version,
        },
      ],
    },
  },
  components,
  dependencies: [
    { ref: appRef, dependsOn: components.map((component) => component['bom-ref']) },
    ...components.map((component) => ({ ref: component['bom-ref'], dependsOn: [] })),
  ],
}

const output = resolve(root, 'LICENSES', 'SBOM.cdx.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(bom, null, 2)}\n`, 'utf8')
console.log(output)
