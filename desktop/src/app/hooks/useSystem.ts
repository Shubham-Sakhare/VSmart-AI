import { useEffect, useState } from "react";

interface SystemInfo {
  cpu: number;
  ram: number;
  storage: number;
}

export function useSystem() {

  const [system, setSystem] =
    useState<SystemInfo | null>(null);


  async function loadSystem() {

    try {

    const data =
    await window.vsmart.system.getInfo() as SystemInfo;


      setSystem({

        cpu: data.cpu,

        ram: data.ram,

        storage: data.storage

      });


    } catch(error) {

      console.error(
        "System info error:",
        error
      );

    }

  }


  useEffect(() => {

    loadSystem();


    const interval =
      setInterval(
        loadSystem,
        5000
      );


    return () => {

      clearInterval(interval);

    };


  }, []);


  return system;

}