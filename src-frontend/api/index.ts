import { ProjectManager } from "./api";
import { SOCKET_URL } from "./url";

export * from "./auth";
export * from "./api";
export default new ProjectManager(new WebSocket(SOCKET_URL));
