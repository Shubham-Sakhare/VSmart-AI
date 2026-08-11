import { ipcMain } from "electron";
import {
  createProject,
  writeProjectFiles,
  openProjectInVSCode,
  readProjectFile,
  listProjectFiles,
  runTerminalCommand,
  isDangerousCommand,
  type ProjectFile
} from "../services/projectService.js";

export function registerProjectIPC() {

  ipcMain.handle("project:create", async (_, folderName: string, files: ProjectFile[]) => {
    try {
      const projectPath = createProject(folderName, files);
      await openProjectInVSCode(projectPath);
      return { ok: true, projectPath };
    } catch (error) {
      console.error("project:create IPC error:", error);
      return { ok: false, projectPath: null };
    }
  });

  ipcMain.handle("project:writeFiles", async (_, projectPath: string, files: ProjectFile[]) => {
    try {
      writeProjectFiles(projectPath, files);
      return true;
    } catch (error) {
      console.error("project:writeFiles IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("project:openInVSCode", async (_, projectPath: string) => {
    try {
      return await openProjectInVSCode(projectPath);
    } catch (error) {
      console.error("project:openInVSCode IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("project:readFile", async (_, projectPath: string, relativePath: string) => {
    try {
      return readProjectFile(projectPath, relativePath);
    } catch (error) {
      console.error("project:readFile IPC error:", error);
      return null;
    }
  });

  ipcMain.handle("project:listFiles", async (_, projectPath: string) => {
    try {
      return listProjectFiles(projectPath);
    } catch (error) {
      console.error("project:listFiles IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("project:runCommand", async (_, projectPath: string, command: string) => {
    try {
      if (isDangerousCommand(command)) {
        return { stdout: "", stderr: "Blocked: this command looks destructive and was not run.", exitCode: 1 };
      }
      return await runTerminalCommand(projectPath, command);
    } catch (error) {
      console.error("project:runCommand IPC error:", error);
      return { stdout: "", stderr: String(error), exitCode: 1 };
    }
  });

}