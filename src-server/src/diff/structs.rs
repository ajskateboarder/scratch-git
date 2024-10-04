use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Eq, Hash, PartialEq, Copy, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AssetChangeType {
    Before,
    After,
}

/// Represents a changed costume for a sprite or the stage
#[derive(Debug, Eq, Hash, PartialEq, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetChange {
    pub sprite: String,
    pub name: String,
    pub ext: String,
    pub path: String,
    pub on_stage: bool,
    pub kind: Option<AssetChangeType>,
    pub contents: Option<Box<[u8]>>,
}

/// Represents costumes that were added, removed, or changed
#[derive(Debug)]
pub struct AssetChanges {
    pub added: Vec<AssetChange>,
    pub removed: Vec<AssetChange>,
    pub merged: Vec<AssetChange>,
}

/// Represents a changed script for a sprite or stage, and how many blocks were added or removed
#[derive(Debug)]
pub struct ScriptChanges {
    pub sprite: String,
    pub added: usize,
    pub removed: usize,
    pub on_stage: bool,
}

impl ScriptChanges {
    /// Git commit representation of a script change
    pub fn format(&self) -> String {
        let mut commit = format!("{}: ", self.sprite);
        if self.added > 0 {
            commit += &format!("+{}", self.added);
            if self.removed > 0 {
                commit += ", "
            }
        }
        if self.removed > 0 {
            commit += &format!("-{}", self.removed)
        }
        commit += " blocks";
        commit
    }
}

/// Commit generation methods for Scratch project assets and code
#[derive(Debug)]
pub struct Diff {
    pub data: Value,
}
