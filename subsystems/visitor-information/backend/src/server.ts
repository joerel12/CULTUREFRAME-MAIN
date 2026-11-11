import { app, prisma } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => console.info(`CultureFrame API listening on http://localhost:${port}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
