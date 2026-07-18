import os from "os";
import si from "systeminformation";

export async function getSystemInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  const ram = Math.round(
    ((totalMemory - freeMemory) / totalMemory) * 100
  );

  const disks = await si.fsSize();
  const storage =
    disks.length > 0
      ? Math.round(disks[0].use)
      : 0;

  return {
    cpu: getCPUUsage(),
    ram,
    storage
  };
}

function getCPUUsage() {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    idle += cpu.times.idle;

    total +=
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.irq +
      cpu.times.idle;
  });

  return Math.round(
    100 - (idle / total) * 100
  );
}