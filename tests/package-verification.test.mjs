import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentDir = process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");

async function findThemeSchema() {
	const releasesDir = path.join(agentDir, "install", "releases");
	const releases = await readdir(releasesDir, { withFileTypes: true });
	const names = releases.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
	const schemaCandidates = names
		.sort((a, b) => compareVersions(b, a))
		.map((version) => path.join(
			releasesDir,
			version,
			"node_modules/@earendil-works/pi-coding-agent/schemas/theme.schema.json",
		));
	for (const schemaPath of schemaCandidates) {
		try {
			await readFile(schemaPath, "utf8");
			return schemaPath;
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
	}
	throw new Error(`Could not find Pi's theme schema under ${releasesDir}`);
}

function compareVersions(left, right) {
	const parse = (value) => value.replace(/^v/, "").split(/[.-]/).map((part) => /^\d+$/.test(part) ? Number(part) : part);
	const a = parse(left);
	const b = parse(right);
	for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
		const av = a[i] ?? 0;
		const bv = b[i] ?? 0;
		if (av === bv) continue;
		if (typeof av === "number" && typeof bv === "number") return av - bv;
		return String(av).localeCompare(String(bv), undefined, { numeric: true });
	}
	return 0;
}

function assertColorValue(value, at) {
	const isString = typeof value === "string";
	const isPaletteIndex = Number.isInteger(value) && value >= 0 && value <= 255;
	assert.ok(isString || isPaletteIndex, `${at} must be a string or a 0–255 palette index`);
}

function validateThemeAgainstPiSchema(theme, schema, label) {
	// This deliberately validates the schema subset used by Pi's shipped themes
	// (top-level shape, required color roles, ColorValue and additional-property
	// rules); it does not claim to be a general JSON Schema implementation.
	assert.equal(typeof theme, "object", `${label} must be an object`);
	assert.ok(theme !== null && !Array.isArray(theme), `${label} must be an object`);
	assert.equal(typeof theme.name, "string", `${label}.name must be a string`);
	assert.match(theme.name, /^[^/]+$/, `${label}.name must not contain '/'`);
	assert.ok(theme.colors && typeof theme.colors === "object" && !Array.isArray(theme.colors), `${label}.colors must be an object`);
	if (theme.appearance !== undefined) assert.ok(theme.appearance === "dark" || theme.appearance === "light", `${label}.appearance must be dark or light`);

	const topLevelKeys = new Set(Object.keys(schema.properties));
	for (const key of Object.keys(theme)) assert.ok(topLevelKeys.has(key), `${label} has unsupported top-level property ${key}`);
	for (const key of schema.required) assert.ok(Object.hasOwn(theme, key), `${label} is missing required property ${key}`);

	if (theme.vars !== undefined) {
		assert.ok(theme.vars && typeof theme.vars === "object" && !Array.isArray(theme.vars), `${label}.vars must be an object`);
		for (const [key, value] of Object.entries(theme.vars)) assertColorValue(value, `${label}.vars.${key}`);
	}

	const colorSchema = schema.properties.colors;
	for (const key of colorSchema.required) assert.ok(Object.hasOwn(theme.colors, key), `${label}.colors is missing required property ${key}`);
	for (const [key, value] of Object.entries(theme.colors)) {
		assert.ok(Object.hasOwn(colorSchema.properties, key), `${label}.colors has unsupported property ${key}`);
		assertColorValue(value, `${label}.colors.${key}`);
	}

	if (theme.export !== undefined) {
		assert.ok(theme.export && typeof theme.export === "object" && !Array.isArray(theme.export), `${label}.export must be an object`);
		for (const [key, value] of Object.entries(theme.export)) {
			assert.ok(Object.hasOwn(schema.properties.export.properties, key), `${label}.export has unsupported property ${key}`);
			assertColorValue(value, `${label}.export.${key}`);
		}
	}
}

test("package manifest resources resolve to files", async () => {
	const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
	assert.equal(manifest.name, "pi-codex-tui");
	assert.deepEqual(manifest.pi.extensions, ["./src/index.ts"]);
	assert.deepEqual(manifest.pi.themes, ["./themes/*.json"]);
	await readFile(path.join(root, manifest.pi.extensions[0]), "utf8");
	const themes = await readdir(path.join(root, "themes"));
	assert.deepEqual(themes.filter((name) => name.endsWith(".json")).sort(), ["codex-tui-dark.json", "codex-tui-light.json"]);
});

test("dark and light themes conform to the installed Pi theme schema", async () => {
	const schemaPath = await findThemeSchema();
	const schema = JSON.parse(await readFile(schemaPath, "utf8"));
	assert.equal(schema.$id, "https://pi.dev/schemas/theme.schema.json");
	for (const name of ["codex-tui-dark.json", "codex-tui-light.json"]) {
		const theme = JSON.parse(await readFile(path.join(root, "themes", name), "utf8"));
		validateThemeAgainstPiSchema(theme, schema, name);
	}
});

test("extension source registers presentation lifecycle only", async () => {
	const sourceDir = path.join(root, "src");
	const sourceFiles = (await readdir(sourceDir)).filter((name) => name.endsWith(".ts")).sort();
	const sources = await Promise.all(sourceFiles.map((name) => readFile(path.join(sourceDir, name), "utf8")));
	const source = sources.join("\n");
	for (const forbidden of [
		"registerTool(", "registerProvider(", "registerVirtualModel(", "registerMcpServer(",
		"registerCommand(", "registerMessageRenderer(", "registerMarkdownTransformer(",
		"before_agent_start", "before_provider_request", "tool_result", "message_end",
		"context_with_system", "session_before_compact", "session_before_fork",
	]) {
		assert.ok(!source.includes(forbidden), `extension must not register or handle ${forbidden}`);
	}
	assert.match(source, /session_start/);
	assert.match(source, /session_shutdown/);
	assert.match(source, /CustomEditor/);
	const entrypoint = sources[sourceFiles.indexOf("index.ts")];
	const sessionStart = entrypoint.slice(entrypoint.indexOf('pi.on("session_start"'), entrypoint.indexOf('pi.on("session_shutdown"'));
	const themeActivation = sessionStart.indexOf("ctx.ui.setTheme(");
	assert.ok(themeActivation >= 0, "TUI session should activate its bundled Codex theme");
	assert.match(sessionStart.slice(0, themeActivation), /configuredTheme\s*!==\s*undefined[\s\S]*configuredTheme\s*!==\s*["']system["'][\s\S]*configuredTheme\s*!==\s*codexTheme/, "preserve explicit themes while allowing system/default and the matching Codex theme");
});

