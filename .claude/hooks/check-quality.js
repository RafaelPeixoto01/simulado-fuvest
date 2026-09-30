// Hook PreToolUse (matcher: Bash) — bloqueia `git commit` se os checks de
// qualidade do projeto falharem. Generalizacao do check-frontend.js do
// projeto Meu Controle (CR-035): os comandos vem de check-config.json,
// entao o mesmo hook serve para qualquer stack.
//
// Configuracao: .claude/hooks/check-config.json (ao lado deste arquivo)
// {
//   "checks": [
//     { "name": "TypeScript", "cwd": "frontend", "command": "npx tsc --noEmit -p tsconfig.app.json" },
//     { "name": "ESLint",     "cwd": "frontend", "command": "npx eslint src" }
//   ]
// }
// - "cwd" e relativo a raiz do projeto ("" ou omitido = raiz)
// - Checks rodam em ordem; o primeiro que falhar bloqueia o commit (exit 2)
// - Sem config ou com "checks" vazio, o hook nao bloqueia nada (exit 0)

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch (err) {
    // Entrada invalida: nao bloquear o fluxo por falha do proprio hook
    process.exit(0);
  }

  const command = (data.tool_input && data.tool_input.command) || "";

  // So age em comandos de commit
  if (!command.includes("git commit")) {
    process.exit(0);
  }

  // CLAUDE_PROJECT_DIR primeiro: data.cwd pode vir em formato POSIX
  // (Git Bash) ou apontar para subdiretorio, quebrando o path.join
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();

  const configPath = path.join(
    projectDir,
    ".claude",
    "hooks",
    "check-config.json"
  );

  let checks = [];
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    checks = Array.isArray(config.checks) ? config.checks : [];
  } catch (err) {
    process.stderr.write(
      "check-quality: sem check-config.json legivel — nenhum check executado.\n"
    );
    process.exit(0);
  }

  for (const check of checks) {
    if (!check || typeof check.command !== "string" || !check.command.trim()) {
      continue;
    }
    const name = check.name || check.command;
    const cwd = check.cwd
      ? path.join(projectDir, check.cwd)
      : projectDir;

    if (!fs.existsSync(cwd)) {
      process.stderr.write(
        `check-quality: diretorio "${check.cwd}" nao existe — check "${name}" ignorado.\n`
      );
      continue;
    }

    process.stderr.write(`Running ${name} before commit...\n`);
    try {
      execSync(check.command, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: (check.timeoutSeconds || 100) * 1000,
      });
      process.stderr.write(`${name} passed.\n`);
    } catch (err) {
      if (err.stderr) process.stderr.write(err.stderr.toString());
      if (err.stdout) process.stderr.write(err.stdout.toString());
      process.stderr.write(
        `\nCheck "${name}" failed. Fix errors before committing (do NOT use --no-verify).\n`
      );
      process.exit(2);
    }
  }

  process.exit(0);
});
