use crate::diff::Diff;
use crate::utils::projects::ProjectConfig;
use crate::utils::extract::extract;

use rocket::http::{ContentType, Status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Build, Rocket};

use serde_json::{json, to_string, Value};

use std::fs;
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
    thread::sleep,
    time::Duration,
};

#[derive(Deserialize)]
struct DiffParams {
    old_content: String,
    new_content: String,
}

type AppResponse = (Status, (ContentType, String));

fn response(status: Status, content: Value) -> AppResponse {
    (status, (ContentType::JSON, to_string(&content).unwrap()))
}

fn get_project_path(projects: &Value, project_name: &String) -> PathBuf {
    let base_loc = &projects[project_name]["base"].as_str().unwrap().to_string();
    Path::new(&base_loc).to_path_buf()
}

fn project_config() -> &'static Mutex<ProjectConfig> {
    static CONFIG: OnceLock<Mutex<ProjectConfig>> = OnceLock::new();
    CONFIG.get_or_init(|| Mutex::new(ProjectConfig::new("projects/config.json".to_string())))
}

#[post("/diff", format = "json", data = "<diff_params>")]
fn diff(diff_params: Json<DiffParams>) -> AppResponse {
    response(
        Status::Ok,
        json!(crate::utils::git_piping::git_diff(
            diff_params.old_content.clone(),
            diff_params.new_content.clone()
        )),
    )
}

#[get("/create-project?<file_name>")]
fn create_project(file_name: &str) -> AppResponse {
    let binding = Path::new(file_name)
        .file_name()
        .unwrap()
        .to_os_string()
        .to_str()
        .unwrap()
        .to_string();
    let name = binding.split(".").collect::<Vec<_>>()[0].to_string();
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
        return response(
            Status::InternalServerError,
            json!({ "project_name": "fail" }),
        );
    };

    match config.projects[&name] {
        Value::Null => {
            config.projects[name.clone()] = json!({
                "base": project_path.to_str().unwrap().to_string(),
                "project_file": file_path.to_str().unwrap().to_string()
            });
        }
        Value::Object(_) => {
            return response(
                Status::InternalServerError,
                json!({ "project_name": "exists" }),
            );
        }
        _ => todo!("idk"),
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
    // let archive = fs::read()
    // .unwrap();
    extract(fs::File::open(Path::new(
        &project_to_extract["project_file"]
            .as_str()
            .unwrap()
            .to_string(),
    )).expect("failed to open file"), target_dir).unwrap();

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
        return response(
            Status::InternalServerError,
            json!({ "project_name": "fail" }),
        );
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
        return response(
            Status::InternalServerError,
            json!({ "project_name": "fail" }),
        );
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
        return response(
            Status::InternalServerError,
            json!({ "project_name": "fail" }),
        );
    }

    response(
        Status::Ok,
        json!({ "project_name": name.replace("projects/", "") }),
    )
}

#[get("/<project_name>/unzip")]
fn unzip(project_name: String) -> AppResponse {
    let projects = &project_config().lock().unwrap().projects;
    let pth = get_project_path(projects, &project_name);

    fs::copy(pth.join("project.json"), pth.join("project.old.json"))
        .expect("failed to move project.json");

    sleep(Duration::from_millis(1000));
    let target_dir = PathBuf::from(Path::new(&pth));
    extract(fs::File::open(Path::new(
        &projects[project_name]["project_file"]
            .as_str()
            .unwrap()
            .to_string(),
    )).expect("failed to open file"), target_dir).unwrap();

    response(Status::Ok, json!({ "status": "success" }))
}

#[get("/<project_name>/project.old.json?<name>")]
fn old_project(project_name: String, name: String) -> AppResponse {
    let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

    let old_project = serde_json::from_str::<serde_json::Value>(
        &fs::read_to_string(pth.join("project.old.json"))
            .unwrap()
            .as_str(),
    )
    .expect("failed to parse project.old.json");

    let blocks = old_project["targets"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|t| t["name"].as_str().unwrap().to_string() == name)
        .map(|t| t["blocks"].as_object().unwrap())
        .next()
        .unwrap()
        .to_owned();

    response(Status::Ok, serde_json::Value::Object(blocks))
}

#[get("/<project_name>/project.json?<name>")]
fn current_project(project_name: String, name: String) -> AppResponse {
    let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

    let old_project = serde_json::from_str::<serde_json::Value>(
        &fs::read_to_string(pth.join("project.json"))
            .unwrap()
            .as_str(),
    )
    .expect("failed to parse project.json");

    let blocks = old_project["targets"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|t| t["name"].as_str().unwrap().to_string() == name)
        .map(|t| t["blocks"].as_object().unwrap())
        .next()
        .unwrap()
        .to_owned();

    response(Status::Ok, serde_json::Value::Object(blocks))
}

#[get("/<project_name>/sprites")]
fn sprites(project_name: String) -> AppResponse {
    let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

    let binding = &fs::read_to_string(pth.join("project.old.json"));
    let project_old_json = match binding {
        Ok(fh) => fh.as_str(),
        Err(_) => {
            return response(
                Status::InternalServerError,
                json!({ "status": "you forgot to unzip the project dingus" }),
            )
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

    response(
        Status::Ok,
        json!({
            "sprites": current_diff.commits(&new_diff)
                .iter()
                .map(|commit| commit.split(":").collect::<Vec<_>>()[0])
                .collect::<Vec<_>>()
        }),
    )
}

#[get("/<project_name>/push")]
fn push(project_name: String) -> AppResponse {
    let pth = get_project_path(&project_config().lock().unwrap().projects, &project_name);

    if !Command::new("git")
        .arg("push")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(&pth)
        .status()
        .unwrap()
        .success()
    {
        return response(Status::InternalServerError, json!({ "status": "fail" }));
    }

    response(Status::Ok, json!({ "status": "success" }))
}

#[get("/<project_name>/commit")]
fn commit(project_name: String) -> AppResponse {
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
        return response(
            Status::InternalServerError,
            json!({ "project_name": "fail" }),
        );
    }

    let mut binding = Command::new("git");
    let git_commit = binding
        .args(["commit", "-m", commit_message.as_str()])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(pth);
    if !git_commit.status().unwrap().success() {
        return response(
            Status::InternalServerError,
            json!({ "project_name": "Nothing to add" }),
        );
    }

    response(Status::Ok, json!({ "message": commit_message }))
}

#[get("/<project_name>/commits")]
fn commits(project_name: String) -> AppResponse {
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
    let log_output = binding.as_str();

    response(
        Status::Ok,
        serde_json::from_str(("[".to_owned() + &log_output + "]").as_str())
            .expect("failed to parse log output"),
    )
}

pub fn create_app() -> Rocket<Build> {
    let cors = rocket_cors::CorsOptions::default().to_cors();

    rocket::build()
        .mount(
            "/",
            routes![
                diff,
                create_project,
                unzip,
                commit,
                push,
                old_project,
                current_project,
                sprites,
                commits
            ],
        )
        .attach(cors.unwrap())
}
