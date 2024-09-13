import van from "vanjs-core";
import api, { Project, remoteExists } from "@/api";
import { settings, gitMenu } from "@/components";
import { InputBox, InputField } from "@/components/input-field";
import { validURL } from "@/utils";
import { Modal } from "../modal";
import { Base } from "../base";

const { main, button, div, label, br } = van.tags;

export class RepoConfigModal extends Base {
  private $repository: HTMLInputElement = InputBox({
    placeholder: "Enter a link to a repository URL",
    onblur: async ({ target }: Event) => {
      const url: string = (target as HTMLInputElement).value;
      if (!validURL(url) && !(await remoteExists(url))) {
        this.$repository.value = "";
      }
    },
  });

  private $name: HTMLInputElement = InputBox({});
  private $email: HTMLInputElement = InputBox({});

  private project: Project;

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.close();

    const saveButton = button(
      {
        class: settings.button,
        onclick: () => {
          if (this.$name.value.trim() === "") {
            alert("Don't leave starred fields blank");
            return;
          }
          if (this.$repository.value.trim() !== "") {
            gitMenu.setPushPullStatus(true);
          }
          this.project.setDetails({
            username: this.$name.value,
            email: this.$email.value,
            repository: this.$repository.value,
          });
        },
      },
      "Save"
    );

    van.add(
      this,
      Modal(
        main(
          InputField(
            {},
            label({ class: "input-label" }, "Name", "*"),
            this.$name
          ),
          br(),
          InputField(
            {},
            label({ class: "input-label" }, "Repository URL (optional)"),
            this.$repository
          ),
          br(),
          InputField({}, label({ class: "input-label" }, "Email"), this.$email),
          br(),
          br(),
          div({ class: "bottom-bar repo-config-bottom-bar" }, saveButton)
        ),
        "Project/repository settings",
        () => this.close()
      )
    );
  }

  public async display() {
    this.project = api.getCurrentProject()!;

    if (await this.project?.exists()) {
      const details = await this.project?.getDetails();

      // in the future, these will never be blank, I think
      this.$repository.value = details.repository ?? "";
      this.$name.value = details.username ?? "";
      this.$email.value = details.email ?? "";
    }

    if (!this.open) this.showModal();
  }
}
