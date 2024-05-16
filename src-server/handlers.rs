use dunce::canonicalize;
use std::fs::{self, File};
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread::sleep,
    time::Duration,
};
use tungstenite::Message;
use walkdir::WalkDir;

use serde::{Deserialize, Serialize};
use serde_json::{self, from_str, json, Error, Value};

use crate::diff::{Diff, ScriptChanges};
use crate::git;
use crate::projects::{get_project_path, project_config};
use crate::zipping::{self, extract};

#[derive(Serialize, Deserialize, PartialEq)]
enum CmdData<'a> {
    Project {
        project_name: &'a str,
        sprite_name: Option<&'a str>,
    },
    GitDiff {
        old_content: String,
        new_content: String,
    },
    GitDetails {
        project_name: String,
        username: String,
        email: String,
        repository: String,
    },
    FilePath(String),
    URL(String),
}

#[derive(Serialize, Deserialize)]
pub struct Cmd<'a> {
    command: &'a str,
    data: CmdData<'a>,
}

pub struct CmdHandler {
    debug: bool,
}

impl CmdHandler {
    fn new(debug: bool) -> CmdHandler {
        CmdHandler { debug }
    }

    fn diff(&self, data: CmdData) -> Value {
        let CmdData::GitDiff {
            old_content,
            new_content,
        } = data
        else {
            return json!({});
        };
        json!(git::diff(
            old_content.to_string(),
            new_content.to_string(),
            2000
        ))
    }

    fn create_project(&self, data: CmdData) -> Value {
        let CmdData::FilePath(file_name) = data else {
            return json!({});
        };
        let name = Path::new(&file_name)
            .file_name()
            .unwrap()
            .to_os_string()
            .to_str()
            .unwrap()
            .to_string();
        let name = name.split(".").next().unwrap();
        let mut config = project_config().lock().unwrap();

        if self.debug {
            println!("create_project: got project name: {name}")
        }

        let project_path_result = canonicalize(Path::new("projects").join(&name));
        let project_path = match project_path_result {
            Ok(file) => file,
            Err(_) => {
                let _ = fs::create_dir(Path::new("projects").join(&name));
                canonicalize(Path::new("projects").join(&name)).unwrap()
            }
        };

        let Ok(file_path) = canonicalize(&file_name) else {
            if self.debug {
                println!("create_project: failed to find project file")
            }

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

        let init_repo = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "init"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.arg("init");
            git
        }
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(&project_path)
        .output()
        .expect("failed to initialize git repo");

        let response = String::from_utf8(init_repo.stdout).unwrap();
        dbg!(&response);

        if !response.contains("Git repository") {
            if self.debug {
                println!("create_project: git init did not state that new repo was made")
            }
            return json!({ "project_name": "fail" });
        }

        if !git::add(&project_path) {
            if self.debug {
                println!("create_project: assets could not be added")
            }
            return json!({ "project_name": "fail" });
        }

        let mut commit = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "commit", "-m", "Initial commit"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["commit", "-m", "Initial commit"]);
            git
        };

        let commit = commit
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(project_path);
        let commit = String::from_utf8(commit.output().unwrap().stdout).unwrap();

        if !commit.contains("Initial commit") {
            if self.debug {
                println!("create_project: initial commit could not be created. reason:\n\n{commit}")
            }
            return json!({ "project_name": "fail" });
        }

        json!({ "project_name": name.replace("projects/", "") })
    }

    fn set_project_details(&self, data: CmdData) -> Value {
        let CmdData::GitDetails {
            username,
            email,
            repository,
            project_name,
            ..
        } = data
        else {
            return json!({});
        };
        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);
        let mut success = true;

        let config_user = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "config", "user.name", &username]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["config", "user.name", &username]);
            git
        }
        .current_dir(&pth)
        .status();
        if !config_user.unwrap().success() {
            success = false;
        }

        let config_email = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "config", "user.email", &email]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["config", "user.email", &email]);
            git
        }
        .current_dir(&pth)
        .status();
        if !config_email.unwrap().success() {
            success = false;
        }

        let config_remote = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "remote", "add", "origin", &repository]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["remote", "add", "origin", &repository]);
            git
        }
        .current_dir(&pth)
        .output();

        if !String::from_utf8(config_remote.unwrap().stdout)
            .unwrap()
            .ends_with("already exists")
        {
            let config_remote = if cfg!(target_os = "windows") {
                let mut cmd = Command::new("cmd");
                cmd.args(["/C", "git", "remote", "set-url", "origin", &repository]);
                cmd
            } else {
                let mut git = Command::new("git");
                git.args(["remote", "set-url", "origin", &repository]);
                git
            }
            .current_dir(&pth)
            .status();
            if !config_remote.unwrap().success() {
                success = false;
            }
        }

        json!({"success": success})
    }

    fn get_project_details(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };
        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

        let config_user = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "config", "user.name"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["config", "user.name"]);
            git
        }
        .current_dir(&pth)
        .output();
        let config_user = String::from_utf8(config_user.unwrap().stdout).unwrap();

        let config_email = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "config", "user.email"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["config", "user.email"]);
            git
        }
        .current_dir(&pth)
        .output();
        let config_email = String::from_utf8(config_email.unwrap().stdout).unwrap();

        let config_remote = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "remote", "get-url", "origin"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["remote", "get-url", "origin"]);
            git
        }
        .current_dir(&pth)
        .output();
        let config_remote = String::from_utf8(config_remote.unwrap().stdout).unwrap();

        json!({"username": config_user, "email": config_email, "repository": config_remote})
    }

    fn exists(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };
        let projects = &project_config().lock().unwrap().projects;
        json!({ "exists": projects[project_name] != Value::Null })
    }

    fn remote_exists(&self, data: CmdData) -> Value {
        let CmdData::URL(url) = data else {
            return json!({});
        };

        let ls_remote = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "ls-remote", &url]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["ls-remote", &url]);
            git
        }
        .output();

        let ls_remote = String::from_utf8(ls_remote.unwrap().stdout).unwrap();

        return json!({"exists": ls_remote.contains("fatal")});
    }

    fn unzip(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };

        let projects = &project_config().lock().unwrap().projects;
        let pth = get_project_path(projects, project_name);

        fs::copy(pth.join("project.json"), pth.join("project.old.json"))
            .expect("failed to move project.json");

        sleep(Duration::from_millis(1000));
        let target_dir = &PathBuf::from(Path::new(&pth));
        extract(
            fs::File::open(Path::new(
                &projects[project_name]["project_file"]
                    .as_str()
                    .unwrap()
                    .to_string(),
            ))
            .expect("failed to open file"),
            target_dir.to_path_buf(),
        )
        .unwrap();

        fs::write(target_dir.join(".gitignore"), "project.old.json")
            .expect("failed to write gitignore");

        json!({ "status": "success" })
    }

    fn get_project(&self, data: CmdData, old: bool) -> Value {
        let CmdData::Project {
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

    fn push(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };

        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);
        let mut push = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "push", "--set-upstream", "origin", "master"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["push", "--set-upstream", "origin", "master"]);
            git
        };
        let push = push
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&pth);

        let output = push.output().unwrap();
        let stderr = String::from_utf8(output.stderr).unwrap();

        // TODO: these checks might be very brittle
        if stderr.contains(" ! [") && stderr.contains("git pull ...") {
            json!({"status": "pull needed"})
        } else if output.status.success()  {
            if stderr.contains("Everything up-to-date") {
                json!({"status": "up to date"})
            } else {
                json!({"status": "success"})
            }
        } else {
            json!({"status": "fail"})
        }
    }

    fn pull(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };
        let projects = &project_config().lock().unwrap().projects;
        let pth = get_project_path(projects, &project_name);
        let sb3 = projects[&project_name]["project_file"].as_str().unwrap();

        let mut pull = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "pull", "origin", "master", "--rebase"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["pull", "origin", "master", "--rebase"]);
            git
        };
        let pull = pull
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&pth);

        if pull.status().unwrap().success() {
            let stdout = String::from_utf8(pull.output().unwrap().stdout).unwrap();
            if stdout.contains("Already up to date") {
                return json!({"status": "nothing new"})
            }

            let walkdir = WalkDir::new(&pth);
            let it = walkdir.into_iter();
            zipping::zip(
                &mut it.filter_map(|e| e.ok()),
                &pth,
                File::create(Path::new(sb3)).unwrap(),
            );

            json!({"status": "success"})
        } else {
            let stderr = String::from_utf8(pull.output().unwrap().stderr).unwrap();
            if stderr.contains("unrelated histories") {
                json!({"status": "unrelated histories"})
            } else {
                json!({"status": "Error: ".to_owned() + &stderr})
            }
        }
    }

    fn commit(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };

        let project_path =
            get_project_path(&project_config().lock().unwrap().projects, &project_name);

        if self.debug {
            println!(
                "commit: path to project is {}",
                project_path.to_string_lossy()
            );
            println!("commit: path exists? {}", project_path.exists())
        }

        let current_diff = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(project_path.join("project.old.json"))
                .unwrap()
                .as_str(),
        )
        .unwrap();
        let current_diff = Diff::new(&current_diff);

        let new_diff = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(project_path.join("project.json"))
                .unwrap()
                .as_str(),
        )
        .unwrap();
        let new_diff = Diff::new(&new_diff);

        for change in new_diff.costumes(&current_diff) {
            fs::remove_file(project_path.join(change.costume_path))
                .expect("failed to remove asset");
        }

        if !git::add(&project_path) {
            return json!({ "message": "Nothing to add" });
        }

        let mut commit = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "commit", "-m", "temporary"]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["commit", "-m", "temporary"]);
            git
        };
        let commit = commit.current_dir(&project_path).status().unwrap();

        if !commit.success() {
            if self.debug {
                println!(
                    "commit: failed to make commit: error code {:?}",
                    commit.code().unwrap_or(-2000000000)
                )
            }
            // TODO: make error message less generic
            return json!({ "message": "Nothing to commit" });
        }

        if self.debug {
            let rev = git::show_revision(&project_path, "HEAD~1:project.json");
            println!("commit: got revision for HEAD~1:project.json:\n\n{rev}")
        }

        let previous_revision = Diff::from_revision(&project_path, "HEAD~1:project.json");
        let commit_message = previous_revision.commits(&new_diff).join(", ");

        let mut commit = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "commit", "--amend", "-m", &commit_message]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["commit", "--amend", "-m", &commit_message]);
            git
        };
        let commit = commit.current_dir(&project_path);

        if !commit.status().unwrap().success() {
            return json!({ "message": "fail" });
        }

        json!({ "message": commit_message })
    }

    fn get_commits(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };
        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);
        let format = "--pretty=format:{\"commit\": \"%H\", \"subject\": \"%s\", \"body\": \"%b\", \"author\": {\"name\": \"%aN\", \"email\": \"%aE\", \"date\": \"%aD\"}},";

        let git_log = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", "git", "log", format]);
            cmd
        } else {
            let mut git = Command::new("git");
            git.args(["log", format]);
            git
        }
        .current_dir(pth)
        .output()
        .unwrap()
        .stdout;

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

    fn get_changed_sprites(&self, data: CmdData) -> Value {
        let CmdData::Project { project_name, .. } = data else {
            return json!({});
        };

        let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

        let binding = &fs::read_to_string(pth.join("project.old.json"));
        let project_old_json = match binding {
            Ok(fh) => fh.as_str(),
            Err(_) => {
                if self.debug {
                    println!("get_changed_sprites: project.old.json does not exist, try commiting this first")
                }
                return json!({ "status": "unzip the project first that should do it" });
            }
        };
        let _current_project = serde_json::from_str::<serde_json::Value>(project_old_json).unwrap();

        let current_diff = Diff::new(&_current_project);
        let _new_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.json"))
                .unwrap()
                .as_str(),
        )
        .unwrap();

        let new_diff = Diff::new(&_new_project);
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
}

pub fn handle_command(msg: String, debug: bool) -> Result<Message, Error> {
    let json: Cmd = match from_str::<Cmd>(msg.as_str()) {
        Ok(j) => j,
        Err(e) => return Err(e),
    };

    let handler = CmdHandler::new(debug);

    Ok(Message::Text(
        match json.command {
            // static
            "diff" => handler.diff(json.data),
            "remote-exists" => handler.remote_exists(json.data),
            "exists" => handler.exists(json.data),
            "create-project" => handler.create_project(json.data),
            // project-specific
            "set-project-details" => handler.set_project_details(json.data),
            "get-project-details" => handler.get_project_details(json.data),
            "unzip" => handler.unzip(json.data),
            "commit" => handler.commit(json.data),
            "push" => handler.push(json.data),
            "pull" => handler.pull(json.data),
            "current-project" => handler.get_project(json.data, false),
            "previous-project" => handler.get_project(json.data, true),
            "get-commits" => handler.get_commits(json.data),
            "get-changed-sprites" => handler.get_changed_sprites(json.data),
            _ => unreachable!(),
        }
        .to_string(),
    ))
}
