use serde_json::Value;

/// Represents a changed costume for a sprite or the stage
#[derive(Debug, Eq, Hash, PartialEq, Clone)]
pub struct CostumeChange {
    pub sprite: String,
    pub costume_name: String,
    pub costume_path: String,
    pub on_stage: bool,
}

/// Represents costumes that were added, removed, or changed
#[derive(Debug)]
pub struct CostumeChanges {
    pub added: Vec<CostumeChange>,
    pub removed: Vec<CostumeChange>,
    pub merged: Vec<CostumeChange>,
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
