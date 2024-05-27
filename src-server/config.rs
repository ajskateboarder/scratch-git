use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

const PROJECT_CONFIG_PATH: &'static str = "projects/config.json";
const TOKEN_PATH: &'static str = "projects/.ghtoken";

/// Represents a loaded project path and the path to it
#[derive(Debug)]
pub struct ProjectConfig {
    file_path: &'static str,
    pub projects: serde_json::Value,
}

impl ProjectConfig {
    pub fn new(file_path: &'static str) -> Self {
        if !Path::new(&file_path).exists() {
            fs::write(&file_path, "{}").expect("unable to create new project config");
        }
        let project = fs::File::open(&file_path).expect("unable to open project config handle");
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
        .expect("unable to save project config");
    }

    /// Returns the path to a project by its name
    pub fn project_path(&self, project_name: &str) -> PathBuf {
        let base_loc = &self.projects[project_name]["base"]
            .as_str()
            .unwrap()
            .to_string();
        Path::new(&base_loc).to_path_buf()
    }

    /// Returns the path to a project's SB3 by its name
    pub fn project_sb3(&self, project_name: &str) -> String {
        self.projects[project_name]["project_file"]
            .as_str()
            .unwrap()
            .to_string()
    }
}

/// Singleton project configuration
pub fn project_config() -> &'static Mutex<ProjectConfig> {
    static CONFIG: OnceLock<Mutex<ProjectConfig>> = OnceLock::new();
    CONFIG.get_or_init(|| Mutex::new(ProjectConfig::new(PROJECT_CONFIG_PATH)))
}

/// Represents a loaded GitHub access token and the path to it
#[derive(Debug)]
pub struct GhToken {
    file_path: &'static str,
    pub token: String,
}

impl GhToken {
    pub fn new(file_path: &'static str) -> Self {
        if !Path::new(&file_path).exists() {
            fs::write(&file_path, "").expect("unable to create token file");
        }

        let mut project = fs::File::open(&file_path).expect("unable to open token handle");
        let mut token = String::new();
        project.read_to_string(&mut token).unwrap();

        Self { file_path, token }
    }

    pub fn get(&mut self) -> &mut String {
        &mut self.token
    }

    pub fn save(&self) {
        fs::write(self.file_path, &self.token).expect("unable to save new token");
    }
}
/// Singleton GitHub token
pub fn gh_token() -> &'static Mutex<GhToken> {
    static CONFIG: OnceLock<Mutex<GhToken>> = OnceLock::new();
    CONFIG.get_or_init(|| Mutex::new(GhToken::new(TOKEN_PATH)))
}
