import van from "vanjs-core";
import api, { Project, remoteExists } from "@/api";
import { Settings } from "@/components/accessors";
import { InputBox, InputField } from "@/components/input-field";
import { validURL } from "@/utils";
import { Modal } from "../modal";
import { Base } from "../base";
import { GitMenu } from "@/components/menus";

const { main, button, div, label, br } = van.tags;

export class RepoConfigModal extends Base {
<<<<<<< HEAD
  private $repository = InputBox({
    placeholder: "Enter a link to a repository URL",
    onblur: async ({ target }: Event) => {
      const url: string = (target as HTMLInputElement).value;
      if (!validURL(url) && !(await remoteExists(url))) {
        this.$repository.value = "";
      }
    },
  });

  private $name = InputBox();
  private $email = InputBox();

  private project: Project;
=======
  $repository!: HTMLInputElement;
  $name!: HTMLInputElement;
  $email!: HTMLInputElement;
  private project!: Project;
>>>>>>> parent of d85cffb (i used to think using an initializer on a wc would be bad)

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
        class: Settings.button,
        onclick: () => {
          if ($name.value.trim() === "") {
            alert("Don't leave starred fields blank");
            return;
          }
<<<<<<< HEAD
          if (this.$repository.value.trim() !== "") {
            GitMenu.setPushPullStatus(true);
=======
          if ($repository.value.trim() !== "") {
            gitMenu.setPushPullStatus(true);
>>>>>>> parent of d85cffb (i used to think using an initializer on a wc would be bad)
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
}
