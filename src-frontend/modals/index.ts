// import { CommitModal } from "./commit_old";
import { WelcomeModal } from "./welcome.tsx";
import { DiffModal } from "./diff/index.ts";
import { CommitModal } from "./commit.tsx";

customElements.define("commit-modal", CommitModal, { extends: "dialog" });
customElements.define("diff-modal", DiffModal, { extends: "dialog" });
customElements.define("welcome-modal", WelcomeModal, { extends: "dialog" });
