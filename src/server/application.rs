use crate::projects::ProjectConfig;
use rocket::http::{ContentType, Status};
use rocket::{Build, Rocket};

use serde_json::{json, to_string, Value};

use std::fs;
use std::{
    io::Cursor,
    path::Path,
    path::PathBuf,
    process::Command,
    sync::{Mutex, OnceLock},
    thread::sleep,
    time::Duration,
};

type Response = (Status, (ContentType, String));

fn response(status: Status, content: Value) -> Response {
    (status, (ContentType::JSON, to_string(&content).unwrap()))
}

fn get_current_project(project_name: &String) -> Path {
    let base_loc = project_config().lock().unwrap().projects[project_name]["base"]
        .as_str()
        .unwrap()
        .to_string();
    Path::new(&base_loc)
}

fn project_config() -> &'static Mutex<ProjectConfig> {
    static ARRAY: OnceLock<Mutex<ProjectConfig>> = OnceLock::new();
    ARRAY.get_or_init(|| Mutex::new(ProjectConfig::new("projects/config.json".to_string())))
}

#[get("/create-project?<file_name>")]
fn create_project(file_name: &str) -> Response {
    let mut name = Path::new(file_name).file_name().unwrap().to_os_string();
    let mut config = project_config().lock().unwrap();

    let project_path_result = fs::canonicalize(Path::new("projects").join(&name));
    let mut project_path = match project_path_result {
        Ok(file) => file,
        Err(_) => {
            let _ = fs::create_dir(Path::new("projects").join(&name));
            fs::canonicalize(Path::new("projects").join(&name)).unwrap()
        }
    };

    let Ok(file_path) = fs::canonicalize(&name) else {
        return response(
            Status::InternalServerError,
            json!({ "project_name": "fail" }),
        );
    };

    let binding = name.clone().into_string().unwrap();

    match config.projects[&binding] {
        Value::Null => {
            config.projects[binding] = json!({
                "base": project_path.to_str().unwrap().to_string(),
                "project_file": file_path.to_str().unwrap().to_string()
            });
        }
        Value::Object(_) => {
            let mut _i = 0;
            let _name = name.clone().into_string().unwrap();
            if Path::new(&format!("projects/{}~0", _name)).exists() {
                while Path::new(&format!("projects/{}~{}", _name, _i)).exists() {
                    _i += 1;
                }
            }
            name = format!("projects/{}~{}", _name, _i).into();
            config.projects[format!("{}~{}", _name, _i)] = json!({
                "base": name.clone().into_string().unwrap(),
                "project_file": file_path.to_str().unwrap().to_string()
            });
            let _project_path = Path::new(&name);
            let _ = fs::create_dir(&_project_path);
            project_path = fs::canonicalize(_project_path).unwrap();
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
    let archive = fs::read(Path::new(
        &project_to_extract["project_file"]
            .as_str()
            .unwrap()
            .to_string(),
    ))
    .unwrap();
    zip_extract::extract(Cursor::new(archive), &target_dir, true)
        .expect("failed to extract archive");

    let init_repo = Command::new("git")
        .args(["init"])
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
        json!({"project_name": name.to_str().unwrap().to_string().replace("projects/", "")}),
    )
}

#[get("/<project_name>/unzip")]
fn unzip(project_name: String) -> Response {
    let project = &project_config().lock().unwrap().projects[project_name];
    let base_loc = project["base"].as_str().unwrap().to_string();
    let project_dir = Path::new(&base_loc);

    fs::copy(
        project_dir.join("project.json"),
        project_dir.join("project.old.json"),
    )
    .expect("failed to move project.json");

    sleep(Duration::from_millis(1000));
    let target_dir = PathBuf::from(Path::new(&base_loc));
    let archive: Vec<u8> = fs::read(Path::new(
        &project["project_file"].as_str().unwrap().to_string(),
    ))
    .unwrap();
    zip_extract::extract(Cursor::new(archive), &target_dir, true)
        .expect("failed to extract archive");

    response(Status::Ok, json!({}))
}

#[get("/<project_name>/project.old.json?<name>")]
fn old_project(project_name: String, name: String) -> Response {
    let base_loc = project_config().lock().unwrap().projects[project_name]["base"]
        .as_str()
        .unwrap()
        .to_string();
    let project_dir = Path::new(&base_loc);

    let old_project = serde_json::from_str::<serde_json::Value>(
        &fs::read_to_string(project_dir.join("project.old.json"))
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
fn current_project(project_name: String, name: String) -> Response {
    let base_loc = project_config().lock().unwrap().projects[project_name]["base"]
        .as_str()
        .unwrap()
        .to_string();
    let project_dir = Path::new(&base_loc);

    let old_project = serde_json::from_str::<serde_json::Value>(
        &fs::read_to_string(project_dir.join("project.json"))
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

#[get("/<project_name>/sprite")]
fn sprites(project_name: String) -> Response {
    let base_loc = project_config().lock().unwrap().projects[project_name]["base"]
        .as_str()
        .unwrap()
        .to_string();
    let project_dir = Path::new(&base_loc);
    todo!()
}

pub fn create_app() -> Rocket<Build> {
    rocket::build().mount(
        "/",
        routes![create_project, unzip, old_project, current_project],
    )
}
