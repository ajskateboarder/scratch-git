import { Modal } from "../base";
import api, { Project, remoteExists } from "@/api";
import { settings, gitMenu } from "@/components";
import { InputBox, InputField } from "@/components/input-field";
import i18next from "@/l10n";
import { validURL } from "@/utils";
import van from "vanjs-core";

const { main, button, h1, div, span, label, br, i } = van.tags;

export class RepoConfigModal extends Modal {
  $repository: HTMLInputElement;
  $name: HTMLInputElement;
  $email: HTMLInputElement;
  private project!: Project;

  connectedCallback() {
    if (this.querySelector("main")) return;

    const closeButton = button(
      {
        class: settings.button,
        style: "margin-left: 10px",
        onclick: () => this.close(),
      },
      i({ class: "fa-solid fa-xmark" })
    );

    const $repository = InputBox({
      placeholder: i18next.t("repoconfig.repo-url-placeholder"),
      onblur: async ({ target }: Event) => {
        const url: string = (target as HTMLInputElement).value;
        if (!validURL(url) && !(await remoteExists(url))) {
          $repository.value = "";
        }
      },
    });
    const $name = InputBox({});
    const $email = InputBox({});

    const saveButton = button(
      {
        class: settings.button,
        onclick: () => {
          if ($name.value.trim() === "") {
            alert(i18next.t("repoconfig.no-empty-fields"));
            return;
          }
          if ($repository.value.trim() !== "") {
            gitMenu.setPushPullStatus(true);
          }
          this.project.setDetails({
            username: $name.value,
            email: $email.value,
            repository: $repository.value,
          });
        },
      },
      // TODO: localize
      "Save"
    );

    const config = i18next
      .t("repoconfig.repoconfig")
      .replace(
        /\[\[(.*?)\]\]/g,
        `<span class="tip" title="${i18next.t(
          "repoconfig.repo-tip"
        )}">$1</span>`
      );

    van.add(
      this,
      main(
        h1(
          { style: "display: flex; justify-content: space-between" },
          span({ innerHTML: config }),
          closeButton
        ),
        InputField(
          {},
          label({ class: "input-label" }, i18next.t("repoconfig.name"), "*"),
          $name
        ),
        br(),
        InputField(
          {},
          label({ class: "input-label" }, i18next.t("repoconfig.repo-url")),
          $repository
        ),
        br(),
        InputField(
          {},
          label({ class: "input-label" }, i18next.t("repoconfig.email")),
          $email
        ),
        br(),
        br(),
        div({ class: "bottom-bar repo-config-bottom-bar" }, saveButton)
      )
    );

    this.$ = {
      $repository,
      $name,
      $email,
    };
  }

  public async display() {
    this.project = api.getCurrentProject()!;

    if (await this.project?.exists()) {
      const details = await this.project?.getDetails();
      const { $repository, $name, $email } = this.$;

      // in the future, these will never be blank
      $repository.value = details.repository ?? "";
      $name.value = details.username ?? "";
      $email.value = details.email ?? "";
    }

    if (!this.open) this.showModal();
  }
}
