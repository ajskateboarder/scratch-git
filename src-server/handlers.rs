use std::fs::{self, File};
use std::net::TcpStream;
use std::{
    path::{Path, PathBuf},
    thread::sleep,
    time::Duration,
};

use anyhow::{anyhow, Context, Result};
use dunce::canonicalize;
use regex_static::{once_cell::sync::Lazy, Regex};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tungstenite::{Message, WebSocket};
use walkdir::WalkDir;

use crate::config::{gh_token, project_config};
use crate::diff::{Diff, ScriptChanges};
use crate::gh_auth;
use crate::git;
use crate::sb3::{get_assets, ProjectData};
use crate::zipping::{self, extract, zip};

macro_rules! here {
    () => {
        concat!("at ", file!(), " line ", line!(), " column ", column!())
    };
}

static CLONE_NAME: Lazy<Regex> = regex_static::lazy_regex!("'(.*)'");

/// Represents all available command types to use with the server
#[derive(Serialize, Deserialize)]
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
    ProjectToCreate {
        file_path: String,
        username: String,
        email: String,
    },
    URL(String),
}

/// Represents a single command message
#[derive(Serialize, Deserialize)]
pub struct Cmd<'a> {
    command: &'a str,
    data: CmdData<'a>,
}

/// Command handler for use with WebSocket server
pub struct CmdHandler<'a> {
    debug: bool,
    socket: &'a mut WebSocket<TcpStream>,
}

impl CmdHandler<'_> {
    fn new<'a>(debug: bool, socket: &'a mut WebSocket<TcpStream>) -> CmdHandler<'a> {
        CmdHandler { debug, socket }
    }

    fn send_json(&mut self, json: Value) -> Result<()> {
        if self.debug {
            println!("Sending message: {}", json.to_string())
        }
        self.socket.send(Message::Text(json.to_string()))?;
        Ok(())
    }

    /// Diff two strings
    // ANCHOR[id=diff]
    fn get_diff(&mut self, data: CmdData) -> Result<()> {
        let CmdData::GitDiff {
            old_content,
            new_content,
        } = data
        else {
            return self.send_json(json!({}));
        };
        self.send_json(json!(git::diff(
            old_content.to_string(),
            new_content.to_string(),
            2000
        )
        .context(here!())?))?;
        Ok(())
    }

    /// Initialize a new project using a project's location and a user's name and email
    // ANCHOR[id=create-project]
    fn create_project(&mut self, data: CmdData) -> Result<()> {
        let CmdData::ProjectToCreate {
            file_path,
            username,
            email,
        } = data
        else {
            return self.send_json(json!({}));
        };
        let name = Path::new(&file_path)
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
                canonicalize(Path::new("projects").join(&name)).context(here!())?
            }
        };

        let Ok(file_path) = canonicalize(&file_path) else {
            if self.debug {
                println!("create_project: failed to find project file")
            }

            return self.send_json(json!({ "status": "fail" }));
        };

        match config.projects[&name] {
            Value::Null => {
                config.projects[name] = json!({
                    "base": project_path.to_str().unwrap().to_string(),
                    "project_file": file_path.to_str().unwrap().to_string()
                });
            }
            Value::Object(_) => {
                return self.send_json(json!({ "status": "exists" }));
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
            .context(here!())?,
            target_dir.clone(),
        )?;

        let init_repo = git::run(vec!["init"], Some(&project_path))
            .output()
            .context(here!())?;
        let response = String::from_utf8(init_repo.stdout)?;

        if !response.contains("Git repository") {
            if self.debug {
                println!("create_project: git init did not state that new repo was made")
            }
            return self.send_json(json!({ "status": "fail" }));
        }

        fs::write(target_dir.join(".gitignore"), "project.old.json").context(here!())?;

        if !git::run(vec!["add", "."], Some(&project_path))
            .status()?
            .success()
        {
            if self.debug {
                println!("create_project: assets could not be added")
            }
            return self.send_json(json!({ "status": "fail" }));
        }

        let project_name = name.replace("projects/", "");

        git::run(vec!["config", "user.email", &email], Some(&project_path));
        git::run(vec!["config", "user.name", &username], Some(&project_path));

        let commit = git::run(vec!["commit", "-m", "Initial commit"], Some(&project_path))
            .output()
            .context(here!())?;
        let response = String::from_utf8(commit.stdout)?;

        if !response.contains("Initial commit") {
            if self.debug {
                println!("create_project: initial commit might not have been created")
            }
            let stderr = String::from_utf8(commit.stderr)?;
            if stderr.contains("*** Please tell me who you are.") {
                return self.send_json(json!({ "status": "needs_info" }));
            }

            return self.send_json(json!({ "status": "fail" }));
        }

        self.send_json(json!({ "project_name": project_name }))
    }

    /// Update a project with new username, email, and repository remote URL
    fn set_project_details(&mut self, data: CmdData, no_send: bool) -> Result<()> {
        let CmdData::GitDetails {
            username,
            email,
            repository,
            project_name,
            ..
        } = data
        else {
            return self.send_json(json!({}));
        };

        let pth = &project_config().lock().unwrap().project_path(&project_name);
        let mut success = true;

        let mut config_user = git::run(vec!["config", "user.name", &username], Some(&pth));
        if !config_user.status().context(here!())?.success() {
            success = false;
        }

        let mut config_email = git::run(vec!["config", "user.email", &email], Some(&pth));
        if !config_email.status().context(here!())?.success() {
            success = false;
        }

        let config_remote = git::run(
            if &repository != "" {
                vec!["remote", "add", "origin"]
            } else {
                vec!["remote", "remove", "origin"]
            },
            Some(&pth),
        )
        .output()
        .context(here!())?;

        if !String::from_utf8(config_remote.stdout)?.ends_with("already exists") {
            let mut config_remote =
                git::run(vec!["remote", "set-url", "origin", &repository], Some(&pth));
            if !config_remote.status().context(here!())?.success() {
                success = false;
            }
        }

        if !no_send {
            self.send_json(json!({"success": success}))?;
        }

        Ok(())
    }

    /// Get a project's username, email, and repository remote URL
    // ANCHOR[id=get-project-details]
    fn get_project_details(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let pth = &project_config().lock().unwrap().project_path(&project_name);

        let config_user = String::from_utf8(
            git::run(vec!["config", "user.name"], Some(&pth))
                .output()
                .context(here!())?
                .stdout,
        )?;
        let config_email = String::from_utf8(
            git::run(vec!["config", "user.email"], Some(&pth))
                .output()
                .context(here!())?
                .stdout,
        )?;
        let config_remote = String::from_utf8(
            git::run(vec!["remote", "get-url", "origin"], Some(&pth))
                .output()
                .context(here!())?
                .stdout,
        )?;

        self.send_json(
            json!({"username": config_user, "email": config_email, "repository": config_remote}),
        )
    }

    /// Check if a project exists
    // ANCHOR[id=exists]
    fn exists(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let projects = &project_config().lock().unwrap().projects;
        self.send_json(json!({ "exists": projects[project_name] != Value::Null }))
    }

    /// Check if a Git remote URL exists
    // ANCHOR[id=remote-exists]
    fn remote_exists(&mut self, data: CmdData) -> Result<()> {
        let CmdData::URL(url) = data else {
            return self.send_json(json!({}));
        };

        let ls_remote = String::from_utf8(
            git::run(vec!["ls-remote", &url], None)
                .output()
                .context(here!())?
                .stderr,
        )?;

        self.send_json(json!({"exists": !ls_remote.contains("fatal")}))
    }

    /// Unzip the project's configured SB3 into the Git repo directory
    // ANCHOR[id=unzip]
    fn unzip(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let projects = &project_config().lock().unwrap();
        let pth = &projects.project_path(&project_name);
        let projects = &projects.projects;

        fs::copy(pth.join("project.json"), pth.join("project.old.json"))?;

        // TODO: remove sleep?
        sleep(Duration::from_millis(1000));
        let target_dir = &PathBuf::from(Path::new(&pth));
        extract(
            fs::File::open(Path::new(
                &projects[project_name]["project_file"]
                    .as_str()
                    .unwrap()
                    .to_string(),
            ))?,
            target_dir.to_path_buf(),
        )?;

        self.send_json(json!({ "status": "success" }))
    }

    /// Get a sprite's scripts, either old or new
    // ANCHOR[id=get-sprite-scripts]
    fn get_sprite_scripts(&mut self, data: CmdData, old: bool) -> Result<()> {
        let CmdData::Project {
            project_name,
            sprite_name,
        } = data
        else {
            return self.send_json(json!({}));
        };

        let pth = &project_config().lock().unwrap().project_path(&project_name);

        let old_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(
                pth.join(format!("project{}.json", if old { ".old" } else { "" })),
            )?
            .as_str(),
        )?;
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
            self.send_json(serde_json::Value::Object(bl.to_owned()))
        } else {
            self.send_json(json!({}))
        }
    }

    /// Push a project to its configured remote URL
    // ANCHOR[id=push]
    fn push(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let pth = &project_config().lock().unwrap().project_path(&project_name);

        let config_remote = String::from_utf8(
            git::run(vec!["remote", "get-url", "origin"], Some(&pth))
                .output()
                .context(here!())?
                .stdout,
        )?;

        let mut push = git::run(
            vec!["push", "--set-upstream", "origin", "master"],
            Some(pth),
        );

        if config_remote.contains("github.com") {
            let mut token = gh_token().lock().unwrap();
            push.env("GITHUB_TOKEN", token.get());
        }

        let output = push.output().context(here!())?;
        let stderr = String::from_utf8(output.stderr)?;

        // TODO: these checks might be very brittle
        self.send_json(
            if stderr.contains(" ! [") && stderr.contains("git pull ...") {
                json!({"status": "pull needed"})
            } else if output.status.success() {
                if stderr.contains("Everything up-to-date") {
                    json!({"status": "up to date"})
                } else {
                    json!({"status": "success"})
                }
            } else {
                json!({"status": "fail"})
            },
        )
    }

    /// Pull new changes from a project's remote URL
    // ANCHOR[id=pull]
    fn pull(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let projects = &project_config().lock().unwrap();
        let pth = &projects.project_path(&project_name);
        let projects = &projects.projects;
        let sb3 = projects[&project_name]["project_file"].as_str().unwrap();

        let config_remote = String::from_utf8(
            git::run(vec!["remote", "get-url", "origin"], Some(&pth))
                .output()
                .context(here!())?
                .stdout,
        )?;

        let mut pull = git::run(vec!["pull", "origin", "master", "--rebase"], Some(pth));

        if config_remote.contains("github.com") {
            let mut token = gh_token().lock().unwrap();
            pull.env("GITHUB_TOKEN", token.get());
        }

        let pull = pull.output().context(here!())?;

        if pull.status.success() {
            let stdout = String::from_utf8(pull.stdout)?;

            if stdout.contains("Already up to date") {
                return self.send_json(json!({"status": "nothing new"}));
            }

            let walkdir = WalkDir::new(&pth);
            let it = walkdir.into_iter();
            zipping::zip(
                &mut it.filter_map(|e| e.ok()),
                &pth,
                File::create(Path::new(sb3))?,
                false,
            );

            self.send_json(json!({"status": "success"}))
        } else {
            let stderr = String::from_utf8(pull.stderr)?;

            if stderr.contains("unrelated histories") {
                self.send_json(json!({"status": "unrelated histories"}))
            } else {
                self.send_json(json!({"status": "Error: ".to_owned() + &stderr}))
            }
        }
    }

    /// Commit new changes to a project
    // ANCHOR[id=commit]
    fn commit(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let pth = &project_config().lock().unwrap().project_path(&project_name);

        let current_diff = Diff::new(&serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.old.json"))?.as_str(),
        )?);

        let new_diff = Diff::new(&serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.json"))?.as_str(),
        )?);

        for change in new_diff.costumes(&current_diff) {
            fs::remove_file(pth.join(change.costume_path))?;
        }

        if !git::run(vec!["add", "."], Some(&pth)).status()?.success() {
            return self.send_json(json!({ "message": "Nothing to add" }));
        }

        let commit = git::run(vec!["commit", "-m", "temporary"], Some(pth))
            .output()
            .context(here!())?;

        if !commit.status.success() {
            if self.debug {
                println!(
                    "commit: failed to make commit: error code {:?}",
                    commit.status.code().unwrap_or(-2000000000)
                )
            }
            // TODO: make error message less generic
            return self.send_json(json!({ "message": "Nothing to commit" }));
        }

        if self.debug {
            let rev = git::show_revision(&pth, "HEAD~1:project.json")?;
            println!("commit: got revision for HEAD~1:project.json:\n\n{rev}")
        }

        let previous_revision = Diff::from_revision(&pth, "HEAD~1:project.json")?;
        let commit_message = previous_revision.commits(&new_diff)?.join(", ");

        let commit =
            git::run(vec!["commit", "--amend", "-m", &commit_message], Some(&pth)).status()?;

        if !commit.success() {
            return self.send_json(json!({ "message": "fail" }));
        }

        self.send_json(json!({ "message": commit_message }))
    }

    /// Get a project's commits
    // ANCHOR[id=get-commits]
    fn get_commits(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };
        let pth = &project_config().lock().unwrap().project_path(&project_name);
        let format = "--pretty=format:{\"commit\": \"%H\", \"subject\": \"%s\", \"body\": \"%b\", \"author\": {\"name\": \"%aN\", \"email\": \"%aE\", \"date\": \"%aD\"}},";

        let git_log = String::from_utf8(
            git::run(vec!["log", format], Some(pth))
                .output()
                .context(here!())?
                .stdout,
        )?;

        let binding = if git_log.as_str().matches("\"commit\"").count() > 1 {
            format!(
                "[{}]",
                git_log.replace(" }\n}", " }\n},").as_str()[..git_log.len() - 1].to_string()
            )
        } else {
            format!("[{git_log}]")
        };
        let log_output = if binding.ends_with(",]") {
            binding[..binding.len() - 2].to_owned() + "]"
        } else {
            binding
        };

        self.send_json(serde_json::from_str(&log_output)?)
    }

    // ANCHOR[id=get-changed-sprites]
    fn get_changed_sprites(&mut self, data: CmdData) -> Result<()> {
        let CmdData::Project { project_name, .. } = data else {
            return self.send_json(json!({}));
        };

        let pth = &project_config().lock().unwrap().project_path(&project_name);

        let binding = &fs::read_to_string(pth.join("project.old.json"));
        let project_old_json = match binding {
            Ok(fh) => fh.as_str(),
            Err(_) => {
                if self.debug {
                    println!("get_changed_sprites: project.old.json does not exist, try commiting this first")
                }
                return self
                    .send_json(json!({ "status": "unzip the project first that should do it" }));
            }
        };
        let _current_project = serde_json::from_str::<serde_json::Value>(project_old_json)?;

        let current_diff = Diff::new(&_current_project);
        let _new_project = serde_json::from_str::<serde_json::Value>(
            &fs::read_to_string(pth.join("project.json"))?.as_str(),
        )?;

        let new_diff = Diff::new(&_new_project);
        let sprites: Vec<_> = current_diff
            .blocks(&new_diff)?
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

        self.send_json(json!({ "sprites": sprites }))
    }

    /// Set up GitHub authentication for use with any configured project
    fn gh_auth(&mut self) -> Result<()> {
        let mut gh_token = gh_token().lock().unwrap();
        let current_token = gh_token.get().to_string();

        if gh_auth::current_user(current_token.clone()).is_some() {
            self.send_json(json!({"success": true}))?;
            return Ok(());
        }

        let code = gh_auth::device_code();
        self.send_json(code.json()?)?;

        let token = loop {
            let token = gh_auth::access_token(code.json::<gh_auth::DeviceCode>()?);
            if let Some(token) = token {
                break token;
            }
            sleep(Duration::from_millis(5000))
        };

        *gh_token.get() = token.clone();
        gh_token.save();

        self.send_json(json!({"success": true}))?;
        Ok(())
    }

    // ANCHOR[id=clone-repo]
    fn clone_repo(&mut self, data: CmdData) -> Result<()> {
        let CmdData::URL(url) = data else {
            self.send_json(json!({}))?;
            return Ok(());
        };

        let project_dir = &PathBuf::from("./projects");
        // was considering adding --depth=1 but that might not work here
        let clone = git::run(vec!["clone", &url], Some(project_dir))
            .output()
            .context(here!())?;

        if !clone.status.success() {
            self.send_json(if clone.status.code().ok_or(anyhow!("no code"))? == 128 {
                json!({"success": false, "reason": -4})
            } else {
                json!({"success": false, "reason": -1})
            })?;
            return Ok(());
        }

        let mut name = CLONE_NAME
            .find(std::str::from_utf8(&clone.stderr)?)
            .ok_or(anyhow!("failed to match"))?
            .as_str();
        name = &name[1..&name.len() - 1];
        let t_project_dir = &project_dir.join(name);

        let json_path = &canonicalize(t_project_dir.join("project.json"))?;

        if !json_path.exists() {
            self.send_json(json!({"success": false, "reason": -2}))?;
            let _ = fs::remove_dir_all(project_dir);
            return Ok(());
        }

        let json: ProjectData = serde_json::from_reader(File::open(json_path)?)?;

        let mut assets: Vec<_> = get_assets(json);
        assets.push("project.json".into());

        let mut assets_to_zip: Vec<_> = vec![];

        // this broke me
        for p in WalkDir::new(t_project_dir).into_iter() {
            // if the repo contains all assets, push every dir entry whos path exists among assets
            let p = p?;
            let path = p.path();
            if !path.exists() {
                self.send_json(json!({"success": false, "reason": -3}))?;
                let _ = fs::remove_dir_all(project_dir)?;
            }
            if assets.iter().any(|x| path.ends_with(x)) {
                assets_to_zip.push(p);
            }
        }

        zip(
            &mut assets_to_zip.into_iter(),
            &PathBuf::from("."),
            File::create(format!("{name}.sb3"))?,
            true,
        );

        let mut config = project_config().lock().unwrap();
        let project_path = &canonicalize(format!("{name}.sb3"))?;

        config.projects[name] = json!({
            "base": &canonicalize(t_project_dir)?,
            "project_file": project_path
        });

        config.save();

        self.send_json(json!({"success": true, "path": project_path}))
    }
}

pub fn handle_command(msg: Cmd, socket: &mut WebSocket<TcpStream>, debug: bool) -> Result<()> {
    let mut handler = CmdHandler::new(debug, socket);

    match msg.command {
        // static
        "diff" => handler.get_diff(msg.data),
        "remote-exists" => handler.remote_exists(msg.data),
        "exists" => handler.exists(msg.data),
        "create-project" => handler.create_project(msg.data),
        "gh-auth" => handler.gh_auth(),
        "clone-repo" => handler.clone_repo(msg.data),

        // project-specific
        "set-project-details" => handler.set_project_details(msg.data, false),
        "get-project-details" => handler.get_project_details(msg.data),
        "unzip" => handler.unzip(msg.data),
        "commit" => handler.commit(msg.data),
        "push" => handler.push(msg.data),
        "pull" => handler.pull(msg.data),
        "current-project" => handler.get_sprite_scripts(msg.data, false),
        "previous-project" => handler.get_sprite_scripts(msg.data, true),
        "get-commits" => handler.get_commits(msg.data),
        "get-changed-sprites" => handler.get_changed_sprites(msg.data),

        _ => unreachable!(),
    }
}
