use serde_json;
use std::{fs, path::Path};

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
