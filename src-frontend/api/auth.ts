import { SOCKET_URL } from "./config";

export interface DeviceCode {
  user_code: string;
  verification_uri: string;
}

export class GhAuth extends EventTarget {
  private ws: WebSocket;

  constructor() {
    super();
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
      let data: { success: true } & DeviceCode = JSON.parse(message.data);
      if (data.success) {
        this.dispatchEvent(new CustomEvent("login"));
      } else {
        this.dispatchEvent(
          new CustomEvent("devicecode", { detail: data as DeviceCode })
        );
      }
    };
  }

  close() {
    this.ws.close();
  }
}
