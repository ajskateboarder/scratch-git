use std::fs;
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
    thread::sleep,
    time::Duration,
};
use tungstenite::Message;

use serde::{Deserialize, Serialize};
use serde_json::{self, from_str, json, Error, Value};

use crate::diff::{Diff, ScriptChanges};
use crate::utils::extract::extract;
use crate::utils::projects::ProjectConfig;

fn get_project_path(projects: &Value, project_name: &str) -> PathBuf {
    let base_loc = &projects[project_name]["base"].as_str().unwrap().to_string();
    Path::new(&base_loc).to_path_buf()
}

fn project_config() -> &'static Mutex<ProjectConfig> {
    static CONFIG: OnceLock<Mutex<ProjectConfig>> = OnceLock::new();
    CONFIG.get_or_init(|| Mutex::new(ProjectConfig::new("projects/config.json")))
}

#[derive(Serialize, Deserialize, PartialEq)]
enum CommandData<'a> {
    Project {
        project_name: &'a str,
        sprite_name: Option<&'a str>,
    },
    // owned strings are needed to account for newlines
    // or maybe i'm doing something wrong
    GitDiff {
        old_content: String,
        new_content: String,
    },
    FilePath(&'a str),
}

#[derive(Serialize, Deserialize)]
pub struct Cmd<'a> {
    command: &'a str,
    data: CommandData<'a>,
}

impl Cmd<'_> {
    fn diff(data: CommandData) -> Value {
        let CommandData::GitDiff {
            old_content,
            new_content,
        } = data
        else {
            return json!({});
        };
        json!(crate::utils::git_piping::git_diff(
            old_content.to_string(),
            new_content.to_string()
        ))
    }

    fn create_project(data: CommandData) -> Value {
        let CommandData::FilePath(file_name) = data else {
            return json!({});
        };
        let binding = Path::new(file_name)
            .file_name()
            .unwrap()
            .to_os_string()
            .to_str()
            .unwrap()
            .to_string();
        let name = binding.split(".").collect::<Vec<_>>()[0];
        let mut config = project_config().lock().unwrap();

        let project_path_result = fs::canonicalize(Path::new("projects").join(&name));
        let project_path = match project_path_result {
            Ok(file) => file,
            Err(_) => {
                let _ = fs::create_dir(Path::new("projects").join(&name));
                fs::canonicalize(Path::new("projects").join(&name)).unwrap()
            }
        };

        let Ok(file_path) = fs::canonicalize(&file_name) else {
            return json!({ "message": "fail" });
        };

        match config.projects[&name] {
            Value::Null => {
                config.projects[name] = json!({
                    "base": project_path.to_str().unwrap().to_string(),
                    "project_file": file_path.to_str().unwrap().to_string()
                });
            }
            Value::Object(_) => {
                return json!({ "project_name": "exists" });
            }
            _ => unreachable!(),
        };

        if !project_path.exists() {
            let _ = fs::create_dir(&project_path);
        }

        config.save();

        let project_to_extract = &config.projects[project_path
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string()];
        let target_dir = PathBuf::from(Path::new(
            &project_to_extract["base"].as_str().unwrap().to_string(),
        ));
        extract(
            fs::File::open(Path::new(
                &project_to_extract["project_file"].as_str().unwrap(),
            ))
            .expect("failed to open file"),
            target_dir,
        )
        .unwrap();

        let init_repo = Command::new("git")
            .args(["init"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&project_path)
            .output()
            .expect("failed to intialize git repo");
        if !String::from_utf8(init_repo.stdout)
            .unwrap()
            .contains("Git repository")
        {
            return json!({ "project_name": "fail" });
        }

        if !Command::new("git")
            .args(["add", "."])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&project_path)
            .status()
            .unwrap()
            .success()
        {
            return json!({ "project_name": "fail" });
        }

        if !String::from_utf8(
            Command::new("git")
                .args(["commit", "-m", "Initial commit"])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .current_dir(project_path)
                .output()
                .unwrap()
                .stdout,
        )
        .unwrap()
        .contains("Initial commit")
        {
            return json!({ "project_name": "fail" });
        }

        json!({ "project_name": name.replace("projects/", "") })
    }

    fn exists(data: CommandData) -> Value {
        let CommandData::Project { project_name, .. } = data else {
            return json!({});
        };
        let projects = &project_config().lock().unwrap().projects;
        json!({ "exists": projects[project_name] != Value::Null })
    }

    fn unzip(data: CommandData) -> Value {
        let CommandData::Project { project_name, .. } = data else {
            return json!({});
        };

        let projects = &project_config().lock().unwrap().projects;
        let pth = get_project_path(projects, project_name);

        fs::copy(pth.join("project.json"), pth.join("project.old.json"))
            .expect("failed to move project.json");

        sleep(Duration::from_millis(1000));
        let target_dir = PathBuf::from(Path::new(&pth));
        extract(
            fs::File::open(Path::new(
                &projects[project_name]["project_file"]
                    .as_str()
                    .unwrap()
                    .to_string(),
            ))
            .expect("failed to open file"),
            target_dir,
        )
        .unwrap();

        json!({ "status": "success" })
    }

    fn get_project(data: CommandData, old: bool) -> Value {
        let CommandData::Project {
            project_name,
            sprite_name,
        } = data
        else {
            return json!({});
        };

        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

        let old_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join(format!("project{}.json", if old { ".old" } else { "" })))
                .unwrap()
                .as_str(),
        )
        .expect("failed to parse project.old.json");
        let targets = old_project["targets"].as_array().unwrap().iter();

        let blocks = if sprite_name.unwrap() == "Stage (stage)" {
            targets
                .filter(|t| t["isStage"].as_bool().unwrap() == true)
                .map(|t| t["blocks"].as_object().unwrap())
                .next()
        } else {
            targets
                .filter(|t| {
                    t["name"].as_str().unwrap().to_string() == sprite_name.unwrap()
                        && !t["isStage"].as_bool().unwrap()
                })
                .map(|t| t["blocks"].as_object().unwrap())
                .next()
        };

        if let Some(bl) = blocks {
            serde_json::Value::Object(bl.to_owned())
        } else {
            json!({})
        }
    }

    fn push(data: CommandData) -> Value {
        let CommandData::Project { project_name, .. } = data else {
            return json!({});
        };
        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);
        json!({ "status": if !Command::new("git")
            .arg("push")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&pth)
            .status()
            .unwrap()
            .success() { "fail" } else { "success" } })
    }

    fn commit(data: CommandData) -> Value {
        let CommandData::Project { project_name, .. } = data else {
            return json!({});
        };

        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);
        let _current_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.old.json"))
                .unwrap()
                .as_str(),
        )
        .unwrap();
        let current_diff = Diff::new(_current_project);

        let _new_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.json"))
                .unwrap()
                .as_str(),
        )
        .unwrap();
        let new_diff = Diff::new(_new_project);

        let costume_removals = new_diff.costumes(&current_diff);
        let commit_message = current_diff.commits(&new_diff).join(", ");

        for change in costume_removals {
            fs::remove_file(pth.join(change.costume_path)).expect("failed to remove asset");
        }

        if !Command::new("git")
            .args(["add", "."])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&pth)
            .status()
            .unwrap()
            .success()
        {
            return json!({ "message": "fail" });
        }

        let mut binding = Command::new("git");
        let git_commit = binding
            .args(["commit", "-m", commit_message.as_str()])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(pth);
        if !git_commit.status().unwrap().success() {
            return json!({ "message": "Nothing to add" });
        }

        json!({ "message": commit_message })
    }

    fn get_commits(data: CommandData) -> Value {
        let CommandData::Project { project_name, .. } = data else {
            return json!({});
        };
        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

        let git_log = Command::new("git")
            .args([
                "log",
                &("--pretty=format:".to_owned()+
                "{\"commit\": \"%H\", \"subject\": \"%s\", \"body\": \"%b\", \"author\": {\"name\": \"%aN\", \"email\": \"%aE\", \"date\": \"%aD\"}},")
            ]).current_dir(pth).output().unwrap().stdout;
        let binding = String::from_utf8(git_log).unwrap();
        let binding = if binding.as_str().matches("\"commit\"").count() > 1 {
            format!(
                "[{}]",
                binding.replace(" }\n}", " }\n},").as_str()[..binding.len() - 1].to_string()
            )
        } else {
            format!("[{binding}]")
        };
        let log_output = if binding.ends_with(",]") {
            binding[..binding.len() - 2].to_owned() + "]"
        } else {
            binding
        };

        serde_json::from_str(&format!("[{log_output}]")).expect("failed to parse log output")
    }

    fn get_changed_sprites(data: CommandData) -> Value {
        let CommandData::Project { project_name, .. } = data else {
            return json!({});
        };

        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

        let binding = &fs::read_to_string(pth.join("project.old.json"));
        let project_old_json = match binding {
            Ok(fh) => fh.as_str(),
            Err(_) => {
                return json!({ "status": "you forgot to unzip the project dingus" });
            }
        };
        let _current_project = serde_json::from_str::<serde_json::Value>(project_old_json).unwrap();

        let current_diff = Diff::new(_current_project);
        let _new_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.json"))
                .unwrap()
                .as_str(),
        )
        .unwrap();

        let new_diff = Diff::new(_new_project);
        let sprites: Vec<_> = current_diff
            .blocks(&new_diff)
            .into_iter()
            .map(|ScriptChanges { sprite, .. }| {
                let parts = sprite.split(" ").collect::<Vec<_>>();
                if parts[0] == "Stage" && parts[1..].join("") == "(stage)" {
                    (parts[0].to_string(), true)
                } else {
                    (sprite, false)
                }
            })
            .collect();
        json!({ "sprites": sprites })
    }

    pub fn handle(msg: String) -> Result<Message, Error> {
        let json: Cmd = match from_str(msg.as_str()) {
            Ok(j) => j,
            Err(e) => return Err(e),
        };

        Ok(Message::Text(
            match json.command {
                "diff" => Cmd::diff(json.data),
                "create-project" => Cmd::create_project(json.data),
                "exists" => Cmd::exists(json.data),
                "unzip" => Cmd::unzip(json.data),
                "commit" => Cmd::commit(json.data),
                "push" => Cmd::push(json.data),
                "current-project" => Cmd::get_project(json.data, false),
                "previous-project" => Cmd::get_project(json.data, true),
                "get-commits" => Cmd::get_commits(json.data),
                "get-changed-sprites" => Cmd::get_changed_sprites(json.data),
                _ => unreachable!(),
            }
            .to_string(),
        ))
    }
}
