import { SOCKET_URL } from "./config";

export interface DeviceCode {
  user_code: string;
  verification_uri: string;
}

export class GhAuth {
  private ws: WebSocket;
  onlogin: () => any = () => {};
  ondevicecode: (data: DeviceCode) => any = () => {};

  constructor() {
    this.ws = new WebSocket(SOCKET_URL);
    this.login();
  }

  private login() {
    this.ws.onopen = () => {
      this.ws.send(
        JSON.stringify({
          command: "gh-auth",
          data: {
            Project: { project_name: "" },
          },
        })
      );
    };

    this.ws.onmessage = (message) => {
      const data: { success: true } & DeviceCode = JSON.parse(message.data);
      if (data.success) {
        this.onlogin();
      } else {
        this.ondevicecode(data);
      }
    };
  }

  close() {
    this.ws.close();
  }
}
