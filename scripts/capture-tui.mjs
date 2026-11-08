#!/usr/bin/env node

import { spawn } from "node:child_process";

function usage() {
  return `Usage: node scripts/capture-tui.mjs --output <file> --cols <n> --rows <n> [--timeout <seconds>] -- <command> [args...]

Run an explicitly supplied command inside a pseudo-terminal and save its raw
terminal output (including ANSI control sequences) to <file>.

Options:
  -o, --output <file>     Capture destination (overwritten if it exists)
      --cols <n>          PTY width in columns
      --rows <n>          PTY height in rows
      --timeout <seconds> Send SIGINT after this many seconds; then terminate
      --help              Show this help

Example:
  node scripts/capture-tui.mjs --output /tmp/pi.ansi --cols 120 --rows 36 \\
    --timeout 8 -- pi --no-session --offline

Requires Node.js and util-linux 'script'. This helper itself makes no network
or model requests. It runs exactly the command after '--'; that command may
have its own network or model behavior. Use isolated app settings and a harmless
command when you need a non-interactive baseline.
`;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function parseArgs(argv) {
  const options = { output: undefined, cols: undefined, rows: undefined, timeout: undefined };
  let index = 0;
  while (index < argv.length) {
    const arg = argv[index++];
    if (arg === "--") {
      options.command = argv.slice(index);
      break;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return options;
    }
    let name;
    let inlineValue;
    const equalIndex = arg.indexOf("=");
    if (equalIndex >= 0) {
      name = arg.slice(0, equalIndex);
      inlineValue = arg.slice(equalIndex + 1);
    } else {
      name = arg;
    }
    const optionNames = {
      "--output": "output",
      "-o": "output",
      "--cols": "cols",
      "--rows": "rows",
      "--timeout": "timeout",
    };
    const key = optionNames[name];
    if (!key) throw new Error(`Unknown option: ${arg}`);
    const value = inlineValue ?? argv[index++];
    if (value === undefined || value === "") throw new Error(`Missing value for ${name}`);
    options[key] = value;
  }

  for (const key of ["cols", "rows"]) {
    const value = Number(options[key]);
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      throw new Error(`--${key} must be an integer between 1 and 1000`);
    }
    options[key] = value;
  }
  if (!options.output) throw new Error("--output is required");
  if (!options.command?.length) throw new Error("Provide a command after --");
  if (options.timeout !== undefined) {
    options.timeout = Number(options.timeout);
    if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
      throw new Error("--timeout must be a positive number of seconds");
    }
  }
  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}`);
  process.exit(2);
}

const command = [
  `stty rows ${options.rows} cols ${options.cols}`,
  `exec ${options.command.map(shellQuote).join(" ")}`,
].join("; ");
const child = spawn("script", ["-qefc", command, options.output], {
  stdio: "inherit",
  detached: true,
});

let timedOut = false;
let escalationTimer;
const timeoutTimer = options.timeout === undefined
  ? undefined
  : setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGINT");
      } catch {}
      escalationTimer = setTimeout(() => {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {}
      }, 1500);
      escalationTimer.unref();
    }, options.timeout * 1000);
timeoutTimer?.unref();

child.on("error", (error) => {
  clearTimeout(timeoutTimer);
  clearTimeout(escalationTimer);
  process.stderr.write(`Could not start util-linux script: ${error.message}\n`);
  process.exitCode = 1;
});

child.on("close", (code, signal) => {
  clearTimeout(timeoutTimer);
  clearTimeout(escalationTimer);
  if (timedOut) {
    process.stderr.write(`Capture stopped after ${options.timeout}s. Output: ${options.output}\n`);
    process.exitCode = 124;
  } else {
    process.stderr.write(`Capture finished. Output: ${options.output}\n`);
    process.exitCode = code ?? (signal ? 128 : 1);
  }
});
