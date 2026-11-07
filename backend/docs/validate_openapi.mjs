/**
 * Validates docs/openapi.yaml against the routes actually registered in
 * src/presentation/routes, then emits docs/openapi.json.
 *
 * It parses the YAML subset used by this file (block mappings, block sequences,
 * `|` and `>` block scalars, quoted and plain scalars, empty flow values). No
 * dependency is added to the workspace for it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.dirname(docsDir);
const specFile = path.join(docsDir, 'openapi.yaml');
const jsonFile = path.join(docsDir, 'openapi.json');
const routesDir = path.join(backendDir, 'src', 'presentation', 'routes');

/* ---------------------------------------------------------------- YAML ----- */

const scalarProblems = [];

const stripComments = lines =>
  lines.filter(line => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('#');
  });

function splitKeyValue(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ':' && (i === text.length - 1 || text[i + 1] === ' ')) {
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }
  }
  return null;
}

function unquote(value) {
  if (value.length >= 2 && (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function scalar(value) {
  if (value === '' || value === '~' || value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return unquote(value);
}
const indentOf = line => line.match(/^ */)[0].length;

function parseYaml(source) {
  const lines = stripComments(source.split(/\r?\n/));
  let index = 0;

  // Real YAML rejects what the subset parser above happily accepts, so every
  // plain scalar is checked against the spec's indentation indicators:
  //   - it may not contain ": " or " #", which read as a mapping or a comment;
  //   - it may not start with a reserved indicator (` , [ ] { } # & * ! @ %),
  //     which reads as flow, an anchor, a comment or a directive;
  //   - a quote that opens must also close on the same line.
  const RESERVED_START = /^[`,#&*!@%]/;
  const assertPlainScalar = (text, raw) => {
    const value = String(text).trim();
    if (value === '') return;
    if (value.startsWith('|') || value.startsWith('>')) return;
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return;
    if (/^["']/.test(value)) {
      scalarProblems.push(`quoted scalar is never closed on its line: ${raw}`);
      return;
    }
    if (RESERVED_START.test(value)) {
      scalarProblems.push(`plain scalar starts with a reserved YAML indicator, quote it: ${raw}`);
      return;
    }
    if (value.includes(': ') || value.includes(' #')) {
      scalarProblems.push(`plain scalar must be quoted (real YAML reads it as a mapping or comment): ${raw}`);
    }
  };
  const lit = (text, raw) => {
    assertPlainScalar(text, raw);
    return scalar(text);
  };

  function blockScalar(minIndent, style) {
    const collected = [];
    while (index < lines.length && indentOf(lines[index]) >= minIndent) {
      collected.push(lines[index].slice(minIndent));
      index += 1;
    }
    return style.startsWith('>') ? collected.join(' ') : collected.join('\n');
  }

  function mapping(indent) {
    const node = {};
    while (index < lines.length) {
      const line = lines[index];
      const here = indentOf(line);
      if (here < indent || (here === indent && line.trim().startsWith('- '))) return node;
      if (here > indent) throw new Error(`Unexpected indent at: ${line}`);
      const pair = splitKeyValue(line.trim());
      if (!pair) throw new Error(`Expected "key: value" but found: ${line}`);
      const [rawKey, rest] = pair;
      const key = unquote(rawKey);
      index += 1;
      if (rest === '') {
        const next = lines[index];
        const deeper = next && indentOf(next) > here;
        const sequenceAtSameIndent = next && indentOf(next) === here && next.trim() === '-';
        node[key] = deeper || sequenceAtSameIndent ? value(here) : null;
      } else if (rest.startsWith('|') || rest.startsWith('>')) {
        node[key] = blockScalar(here + 1, rest);
      } else {
        node[key] = lit(rest, line.trim());
      }
    }
    return node;
  }

  function sequence(indent) {
    const items = [];
    while (index < lines.length) {
      const line = lines[index];
      const here = indentOf(line);
      if (here < indent) return items;
      if (here > indent) throw new Error(`Unexpected indent in sequence at: ${line}`);
      const trimmed = line.trim();
      if (!trimmed.startsWith('- ') && trimmed !== '-') break;
      const content = trimmed === '-' ? '' : trimmed.slice(2);
      const keyColumn = here + 2;
      if (content === '') {
        index += 1;
        items.push(value(here));
        continue;
      }
      const pair = splitKeyValue(content);
      if (pair) {
        // An inline "key: value" opens a mapping whose remaining keys align with it.
        index += 1;
        const item = {};
        const [rawKey, rest] = pair;
        if (rest === '') {
          const next = lines[index];
          item[unquote(rawKey)] = next && indentOf(next) > keyColumn ? value(keyColumn) : null;
        } else if (rest.startsWith('|') || rest.startsWith('>')) {
          item[unquote(rawKey)] = blockScalar(keyColumn + 1, rest);
        } else {
          item[unquote(rawKey)] = lit(rest, content.trim());
        }
        Object.assign(item, mapping(keyColumn));
        items.push(item);
        continue;
      }
      index += 1;
      items.push(lit(content, trimmed));
    }
    return items;
  }

  function value(indent) {
    const line = lines[index];
    if (!line) return null;
    const here = indentOf(line);
    if (here < indent) return null;
    return line.trim().startsWith('- ') || line.trim() === '-' ? sequence(here) : mapping(here);
  }

  return mapping(0);
}

/* -------------------------------------------------------- route inventory -- */

const MOUNTS = {
  ragRoutes: '/rag',
  knowledgeRoutes: '/knowledge',
  proposalRoutes: '/proposals',
  leadIntakeRoutes: '/leads',
  meetingRoutes: '/meetings',
  portalRoutes: '/portal',
  clientRoutes: '/clients',
  rateCardRoutes: '/rate-cards',
  userRoutes: '/users',
  auditRoutes: '/audit-logs',
  authRoutes: '/auth',
  dashboardRoutes: '/dashboard'
};

const HANDLER = /(?:^|[^.\w])(?:router|publicRouter|authenticatedRouter)\.(get|post|patch|put|delete)\(\s*[`'"]([^`'"]*)[`'"]/g;
const normalize = p => p.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}').replace(/\/+$/, '') || '/';

function registeredHandlers() {
  const found = new Map();
  for (const file of fs.readdirSync(routesDir).sort()) {
    if (!file.endsWith('.ts')) continue;
    // docsRoutes.ts serves this document; it is not part of the documented API contract.
    if (file === 'docsRoutes.ts') continue;
    const source = fs.readFileSync(path.join(routesDir, file), 'utf8');
    if (file === 'index.ts') {
      for (const match of source.matchAll(HANDLER)) {
        const key = `${match[1].toUpperCase()} ${normalize(`/api/v1${match[2]}`)}`;
        found.set(key, `${file}`);
      }
      continue;
    }
    const mount = MOUNTS[file.replace(/\.ts$/, '')] ?? '';
    for (const match of source.matchAll(HANDLER)) {
      const key = `${match[1].toUpperCase()} ${normalize(`/api/v1${mount}${match[2]}`)}`;
      found.set(key, file);
    }
  }
  // Health probe is registered on the app itself, outside the API router.
  const appSource = fs.readFileSync(path.join(backendDir, 'src', 'index.ts'), 'utf8');
  if (/app\.get\(\s*'\/health'/.test(appSource)) found.set('GET /health', 'src/index.ts');
  return found;
}

/* ------------------------------------------------------------- assertions -- */

const errors = [];
const warn = message => errors.push(message);

let spec;
try {
  spec = parseYaml(fs.readFileSync(specFile, 'utf8'));
} catch (error) {
  console.error(`openapi.yaml does not parse as YAML: ${error.message}`);
  process.exit(1);
}
if (scalarProblems.length) {
  console.error(`openapi.yaml is not valid real YAML (${scalarProblems.length} problem(s)):`);
  for (const problem of scalarProblems) console.error(`  - ${problem}`);
  process.exit(1);
}
if (spec.openapi !== '3.0.3') warn(`openapi must be a 3.0.x string, got ${JSON.stringify(spec.openapi)}`);
if (!spec.info?.title || !spec.info?.version) warn('info.title and info.version are required');
if (!Array.isArray(spec.servers) || spec.servers.length === 0) warn('servers must list at least one URL');
if (!spec.components?.securitySchemes) warn('components.securitySchemes missing');

const documented = new Map();
const walkRefs = (node, visitor) => {
  if (Array.isArray(node)) {
    node.forEach(item => walkRefs(item, visitor));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node)) {
      if (key === '$ref' && typeof child === 'string') visitor(child);
      else walkRefs(child, visitor);
    }
  }
};

const operationIds = new Map();
const METHODS = ['get', 'post', 'patch', 'put', 'delete'];
const ALLOWED_CODES = new Set(['200', '201', '202', '204', '400', '401', '403', '404', '409', '413', '415', '500', '502', '503', 'default']);
let operationCount = 0;

for (const [rawPath, item] of Object.entries(spec.paths ?? {})) {
  for (const method of METHODS) {
    const operation = item?.[method];
    if (!operation) continue;
    operationCount += 1;
    const label = `${method.toUpperCase()} ${rawPath}`;
    documented.set(`${method.toUpperCase()} ${normalize(rawPath)}`, label);

    if (!operation.operationId) warn(`${label} has no operationId`);
    else if (operationIds.has(operation.operationId)) warn(`${label} duplicates operationId ${operation.operationId}`);
    else operationIds.set(operation.operationId, label);

    if (!operation.summary) warn(`${label} has no summary`);
    if (!Array.isArray(operation.tags) || operation.tags.length === 0) warn(`${label} has no tags`);
    else for (const tag of operation.tags) {
      if (!(spec.tags ?? []).some(defined => defined.name === tag)) warn(`${label} uses undeclared tag "${tag}"`);
    }
    const codes = Object.keys(operation.responses ?? {});
    if (codes.length === 0) warn(`${label} declares no responses`);
    if (!codes.some(code => code.startsWith('2') || code === 'default')) warn(`${label} declares no success response`);
    for (const code of codes) {
      if (!ALLOWED_CODES.has(code)) warn(`${label} documents unexpected status ${code}`);
    }
    const parameterName = param => {
      if (param?.$ref) {
        const target = param.$ref.match(/^#\/components\/parameters\/(.+)$/);
        return target ? spec.components.parameters[target[1]]?.name : undefined;
      }
      return param?.name;
    };
    const declared = new Set((operation.parameters ?? []).map(parameterName).filter(Boolean));
    for (const name of rawPath.match(/\{([^}]+)\}/g) ?? []) {
      const bare = name.slice(1, -1);
      if (!declared.has(bare)) warn(`${label} uses path parameter {${bare}} without declaring it`);
    }
    for (const param of operation.parameters ?? []) {
      const name = parameterName(param);
      if (param.$ref === undefined && param.in === undefined) warn(`${label} has a parameter without "in"`);
      if (name && param.in === 'path' && !rawPath.includes(`{${name}}`)) {
        warn(`${label} declares path parameter "${name}" that is not in the template`);
      }
    }
  }
}

const live = registeredHandlers();
const undocumented = [...live.keys()].filter(key => !documented.has(key));
const invented = [...documented.keys()].filter(key => !live.has(key));
for (const key of undocumented) warn(`registered handler missing from the spec: ${key} (${live.get(key)})`);
for (const key of invented) warn(`spec documents a route that is not registered: ${key}`);

const schemaNames = new Set(Object.keys(spec.components?.schemas ?? {}));
const parameterNames = new Set(Object.keys(spec.components?.parameters ?? {}));
const responseNames = new Set(Object.keys(spec.components?.responses ?? {}));
const schemeNames = new Set(Object.keys(spec.components?.securitySchemes ?? {}));
const refs = new Set();
walkRefs(spec, ref => refs.add(ref));
for (const ref of refs) {
  const match = ref.match(/^#\/components\/(schemas|parameters|responses|securitySchemes)\/(.+)$/);
  if (!match) {
    warn(`unresolvable local reference ${ref}`);
    continue;
  }
  const pool = { schemas: schemaNames, parameters: parameterNames, responses: responseNames, securitySchemes: schemeNames }[match[1]];
  if (!pool.has(match[2])) warn(`dangling reference ${ref}`);
}

const globalSecurity = spec.security ?? [];
for (const [rawPath, item] of Object.entries(spec.paths ?? {})) {
  for (const method of METHODS) {
    const operation = item?.[method];
    if (!operation) continue;
    if (operation.security === undefined) continue;
    for (const option of operation.security) {
      for (const scheme of Object.keys(option ?? {})) {
        if (!schemeNames.has(scheme)) warn(`${method.toUpperCase()} ${rawPath} uses undeclared scheme ${scheme}`);
      }
    }
  }
}

const unusedSchemas = [...schemaNames].filter(name => !refs.has(`#/components/schemas/${name}`));
const unusedParameters = [...parameterNames].filter(name => !refs.has(`#/components/parameters/${name}`));
const unusedResponses = [...responseNames].filter(name => !refs.has(`#/components/responses/${name}`));

fs.writeFileSync(jsonFile, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');

const summary = {
  openapi: spec.openapi,
  operations: operationCount,
  registeredHandlers: live.size,
  documentedPaths: Object.keys(spec.paths ?? {}).length,
  schemas: schemaNames.size,
  parameters: parameterNames.size,
  responses: responseNames.size,
  unusedComponents: [...unusedSchemas, ...unusedParameters, ...unusedResponses]
};

if (errors.length) {
  console.error(`openapi.yaml FAILED with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log('openapi.yaml validated against the registered Express routes.');
console.log(JSON.stringify(summary, null, 2));
console.log(`JSON written to ${jsonFile}`);
