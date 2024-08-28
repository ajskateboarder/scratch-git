import van from "vanjs-core";
import api, { Project, remoteExists } from "@/api";
import { settings, gitMenu } from "@/components";
import { InputBox, InputField } from "@/components/input-field";
import { validURL } from "@/utils";
import { Modal } from "../modal";

const { main, button, div, label, br } = van.tags;

export class RepoConfigModal extends HTMLElement {
  $repository!: HTMLInputElement;
  $name!: HTMLInputElement;
  $email!: HTMLInputElement;
  private project!: Project;

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.close();

    const $repository = InputBox({
      placeholder: "Enter a link to a repository URL",
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
            alert("Don't leave starred fields blank");
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
      "Save"
    );

    van.add(
      this,
      Modal(
        main(
          InputField({}, label({ class: "input-label" }, "Name", "*"), $name),
          br(),
          InputField(
            {},
            label({ class: "input-label" }, "Repository URL (optional)"),
            $repository
          ),
          br(),
          InputField({}, label({ class: "input-label" }, "Email"), $email),
          br(),
          br(),
          div({ class: "bottom-bar repo-config-bottom-bar" }, saveButton)
        ),
        "Project/repository settings",
        () => this.close()
      )
    );

    this.$repository = $repository;
    this.$name = $name;
    this.$email = $email;
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

  close() {
    this.style.display = "none";
  }
  showModal() {
    this.style.display = "flex";
  }
  refresh() {
    this.querySelector("main")?.remove();
    this.connectedCallback();
  }
  get open() {
    return this.style.display !== "none";
  }
}
