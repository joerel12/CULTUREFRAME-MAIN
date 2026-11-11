/*
  MIT License
  Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
  Mindoro State University - Philippines
*/

import fs from "fs/promises";
import path from "path";

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
🚀 XianFire Model & Controller Generator

Usage:
  npm run create:model <ModelName>
  npm run create:controller <ControllerName>

Examples:
  npm run create:model Product
  npm run create:controller productController
`);
  process.exit(0);
}

const type = args[0];
const name = args[1];

const ensureDir = async (dir) => {
  try { await fs.access(dir); }
  catch { await fs.mkdir(dir, { recursive: true }); }
};

const toPascalCase = (str) =>
  str.replace(/[^a-zA-Z0-9]/g, " ")
     .split(" ")
     .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
     .join("");

const toCamelCase = (str) => {
  const p = toPascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const createModel = async (modelName) => {
  const modelDir = path.join(process.cwd(), "models");
  await ensureDir(modelDir);
  const pascal = toPascalCase(modelName);
  const modelPath = path.join(modelDir, `${pascal}.js`);
  const content = `import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const ${pascal} = sequelize.define("${pascal.toLowerCase()}", {
  // TODO: add your columns here
  name: { type: DataTypes.STRING, allowNull: false }
});
export { sequelize };
`;
  await fs.writeFile(modelPath, content);
  console.log(`✅ Model created: ${modelPath}`);
};

const createController = async (controllerName) => {
  const controllerDir = path.join(process.cwd(), "controllers");
  await ensureDir(controllerDir);
  const camel = toCamelCase(controllerName);
  const pascal = toPascalCase(camel.replace(/controller$/i, ""));
  const controllerPath = path.join(controllerDir, `${camel}.js`);
  const content = `import { ${pascal}, sequelize } from "../models/${pascal}.js";
await sequelize.sync();

const ${camel} = {
  index: async (req, res) => {
    res.send("Index Page");
  }
};

export { ${camel} };
`;
  await fs.writeFile(controllerPath, content);
  console.log(`✅ Controller created: ${controllerPath}`);
};

(async () => {
  try {
    if (type === "model") await createModel(name);
    else if (type === "controller") await createController(name);
    else { console.error("❌ Unknown type. Use 'model' or 'controller'."); process.exit(1); }
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
