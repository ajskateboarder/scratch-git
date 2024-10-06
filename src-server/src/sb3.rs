use serde::{Serialize, Deserialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostumeOrSound {
    pub data_format: String,
    pub asset_id: String,
    pub md5ext: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Target {
    pub name: Option<String>,
    pub costumes: Vec<CostumeOrSound>,
    pub sounds: Vec<CostumeOrSound>,
    pub blocks: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectData {
    pub targets: Vec<Target>,
}

pub fn get_assets(project: ProjectData) -> Vec<String> {
    project
        .targets
        .iter()
        .map(|t| {
            let sounds = t.sounds.iter().map(|s| {
                s.md5ext
                    .clone()
                    .unwrap_or(format!("{}.{}", s.asset_id, s.data_format))
                    .to_string()
            });
            let costumes = t.costumes.iter().map(|s| {
                s.md5ext
                    .clone()
                    .unwrap_or(format!("{}.{}", s.asset_id, s.data_format))
                    .to_string()
            });

            sounds.chain(costumes).collect::<Vec<String>>()
        })
        .flatten()
        .collect()
}
