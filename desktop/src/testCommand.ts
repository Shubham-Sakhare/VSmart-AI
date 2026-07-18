import { processCommand } from "./ai/engine";

async function run() {

  const result = await processCommand(
    "Open Chrome"
  );

  console.log(result);

}

run();