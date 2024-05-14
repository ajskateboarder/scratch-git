use serde_json::{self, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

pub struct ProjectConfig {
    file_path: &'static str,
    pub projects: serde_json::Value,
}

impl ProjectConfig {
    pub fn new(file_path: &'static str) -> Self {
        if !Path::new(&file_path).exists() {
            fs::write(&file_path, "{}").expect("Unable to create new file");
        }
        let project = fs::File::open(&file_path).expect("idfk");
        Self {
            file_path,
            projects: serde_json::from_reader(project).unwrap(),
        }
    }

    pub fn save(&self) {
        fs::write(
            &self.file_path,
            serde_json::to_string(&self.projects).unwrap(),
        )
        .expect("failed to save project config");
    }
}

pub fn get_project_path(projects: &Value, project_name: &str) -> PathBuf {
    let base_loc = &projects[project_name]["base"].as_str().unwrap().to_string();
    Path::new(&base_loc).to_path_buf()
}

pub fn project_config() -> &'static Mutex<ProjectConfig> {
    static CONFIG: OnceLock<Mutex<ProjectConfig>> = OnceLock::new();
    CONFIG.get_or_init(|| Mutex::new(ProjectConfig::new("projects/config.json")))
}
