// import { CommitModal } from "./commit_old";
import { WelcomeModal } from "./welcome";
import { DiffModal } from "./diff/index";
import { CommitModal } from "./commit";

customElements.define("commit-modal", CommitModal, { extends: "dialog" });
customElements.define("diff-modal", DiffModal, { extends: "dialog" });

// this is the imposter modal that isn't a wc yet >:\
export { WelcomeModal };
