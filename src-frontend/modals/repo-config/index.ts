import { Modal } from "../base";
import api, { Project, remoteExists } from "@/api";
import { settings, misc, gitMenu } from "@/components";
import { InputBox, InputField } from "@/components/input-field";
import i18next from "@/i18n";
import { validURL } from "@/utils";
import van, { State } from "vanjs-core";

const { main, button, h1, div, span, label, br } = van.tags;

const PENCIL = misc.menuItems
  .select()
  .children[2].children[0].cloneNode() as HTMLImageElement;

export class RepoConfigModal extends Modal {
  private $!: {
    $repository: HTMLInputElement;
    $name: HTMLInputElement;
    $email: HTMLInputElement;
  };

  private editing!: State<boolean>;
  private project!: Project;

  connectedCallback() {
    if (this.querySelector("main")) return;

    this.editing = van.state(false);

    const closeButton = button(
      {
        class: settings.settingsButton,
        style: "margin-left: 10px",
        onclick: () => this.close(),
      },
      "Close"
    );

    const $repository = InputBox({
      placeholder: i18next.t("repoconfig.repo-url-placeholder"),
      onblur: async ({ target }: Event) => {
        const url: string = (target as HTMLInputElement).value;
        if (this.editing.val === true) {
          if (!validURL(url) && !(await remoteExists(url))) {
            $repository.value = "";
          }
        }
      },
    });
    const $name = InputBox({});
    const $email = InputBox({});

    const editButton = button(
      {
        class: settings.settingsButton,
        style:
          "display: flex; padding: 0.4rem; margin-left: auto; align-items: center",
        onclick: () => {
          if (!this.editing.val) {
            this.editing.val = true;
            editButton.innerHTML = `<i class="fa-solid fa-floppy-disk floppy-save-button"></i>`;
          } else {
            if ($name.value.trim() === "") {
              alert(i18next.t("repoconfig.no-empty-fields"));
              return;
            }
            if ($repository.value.trim() !== "") {
              gitMenu.setPushPullStatus(true);
            }
            this.editing.val = false;
            editButton.innerHTML = "";
            editButton.appendChild(PENCIL);
            this.project.setDetails({
              username: $name.value,
              email: $email.value,
              repository: $repository.value,
            });
          }
        },
      },
      PENCIL
    );

    van.derive(() => {
      if (this.editing.oldVal !== this.editing.val) {
        const e: "add" | "remove" = !this.editing.val ? "add" : "remove";
        $repository.classList[e]("disabled-config-input");
        $name.classList[e]("disabled-config-input");
        $email.classList[e]("disabled-config-input");
      }
    });

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
        { id: "commitList" },
        h1(
          { style: "display: flex; gap: 10px" },
          span({ innerHTML: config }),
          editButton
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
        div(
          {
            class: "bottom-bar",
            style: "margin: 0; padding: 0; bottom: 10px; margin-left: 10px",
          },
          closeButton
        )
      )
    );

    $repository.classList.add("disabled-config-input");
    $name.classList.add("disabled-config-input");
    $email.classList.add("disabled-config-input");

    this.$ = {
      $repository,
      $name,
      $email,
    };
  }

  public async display() {
    this.project = (await api.getCurrentProject())!;

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
