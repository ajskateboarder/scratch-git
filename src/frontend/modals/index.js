// import { CommitModal } from "./commit_old";
import { WelcomeModal } from "./welcome";
import { DiffModal } from "./diff/index";
import { CommitModal } from "./commit";

customElements.define("commit-modal", CommitModal, { extends: "dialog" });
customElements.define("diff-modal", DiffModal, { extends: "dialog" });
customElements.define("welcome-modal", WelcomeModal, { extends: "dialog" });
