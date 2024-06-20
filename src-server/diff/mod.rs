pub mod structs;
mod vec_utils;

use crate::git;
pub use structs::*;
use vec_utils::{group_items, intersection};

use itertools::EitherOrBoth::{Both, Left, Right};
use itertools::Itertools;
use regex::Regex;
use serde_json::{Map, Value};
use std::error::Error;
use std::path::PathBuf;
use std::{
    collections::{HashMap, HashSet},
    vec,
};

type Result<T> = std::result::Result<T, Box<dyn Error>>;

impl Diff {
    /// Construct a new diff from a project.json
    ///
    /// ```
    /// let project = json!({"targets":[{"isStage":true,"name":"Stage","variables": ... "monitors":[],"extensions":[]}});
    /// Diff::new(&project);
    /// ```
    pub fn new(data: &Value) -> Self {
        Diff { data: data.clone() }
    }

    /// Construct a new diff from a project.json located in a certain Git revision
    ///
    /// ```
    /// let pth: PathBuf = "path/to/project".into();
    /// // diff for previous commit
    /// Diff::from_revision(&pth, "HEAD~1:project.json");
    /// ```
    pub fn from_revision(pth: &PathBuf, commit: &str) -> Result<Self> {
        let json = git::show_revision(pth, commit);
        let data = serde_json::from_str::<serde_json::Value>(&json?)?;
        Ok(Diff { data: data.clone() })
    }

    /// Attempt to return the MD5 extension of a costume item (project.json)
    pub fn get_costume_path(costume: Value) -> String {
        match costume["md5ext"] {
            Value::String(_) => costume["md5ext"].as_str().unwrap().to_string(),
            Value::Null => format!(
                "{}.{}",
                costume["assetId"].as_str().unwrap().to_string(),
                costume["dataFormat"].as_str().unwrap().to_string()
            ),
            _ => todo!("no idea what to do here"),
        }
    }

    /// Return costumes that have changed between projects, but not added or removed
    fn _merged_costumes<'a>(&'a self, new: &'a Self) -> CostumeChanges {
        let mut added = self.costumes(new);
        let mut removed = new.costumes(self);

        let _m1 = added
            .clone()
            .iter()
            .map(|x| x.to_owned())
            .collect::<HashSet<_>>();
        let _m2 = removed
            .clone()
            .iter()
            .map(|x| x.to_owned())
            .collect::<HashSet<_>>()
            .to_owned();

        let merged = intersection(vec![_m1, _m2]);

        for item in &merged {
            if let Some(pos) = added.iter().position(|x| x == item) {
                added.remove(pos);
            }
        }
        for item in &merged {
            if let Some(pos) = removed.iter().position(|x| x == item) {
                removed.remove(pos);
            }
        }

        CostumeChanges {
            added,
            removed,
            merged: Vec::from_iter(merged),
        }
    }

    /// Return the costume differences between each sprite in two projects
    pub fn costumes(&self, new: &Self) -> Vec<CostumeChange> {
        let new_costumes: Vec<CostumeChange> = new
            ._costumes()
            .into_iter()
            .map(|(sprite, changes)| {
                changes
                    .iter()
                    .map(|costume| CostumeChange {
                        sprite: sprite.clone(),
                        costume_name: costume.0.clone(),
                        costume_path: costume.1.clone(),
                        on_stage: costume.2,
                    })
                    .collect::<Vec<CostumeChange>>()
            })
            .flatten()
            .collect();

        let old_costumes: Vec<CostumeChange> = self
            ._costumes()
            .into_iter()
            .map(|(sprite, changes)| {
                changes
                    .iter()
                    .map(|costume| CostumeChange {
                        sprite: sprite.clone(),
                        costume_name: costume.0.clone(),
                        costume_path: costume.1.clone(),
                        on_stage: costume.2,
                    })
                    .collect::<Vec<CostumeChange>>()
            })
            .flatten()
            .collect();

        let _old_set = HashSet::from_iter(old_costumes);
        let _new_set = HashSet::<CostumeChange>::from_iter(new_costumes.clone());
        let difference: _ = Vec::from_iter(_new_set.difference(&_old_set));
        new_costumes
            .into_iter()
            .filter(|x| difference.contains(&x))
            .collect()
    }

    /// Return the path to every costume being used
    fn _costumes(&self) -> HashMap<String, Vec<(String, String, bool)>> {
        let mut costumes: HashMap<String, Vec<(String, String, bool)>> = HashMap::new();
        if let Some(sprites) = self.data["targets"].as_array() {
            for sprite in sprites {
                if let Some(sprite_costumes) = sprite["costumes"].as_array() {
                    costumes.insert(
                        sprite["name"].as_str().unwrap().to_string()
                            + if sprite["isStage"].as_bool().unwrap() {
                                " (stage)"
                            } else {
                                ""
                            },
                        sprite_costumes
                            .iter()
                            .map(|costume| {
                                (
                                    costume["name"].as_str().unwrap().to_string(),
                                    Diff::get_costume_path(costume.clone()),
                                    sprite["isStage"].as_bool().unwrap(),
                                )
                                    .clone()
                            })
                            .collect(),
                    );
                }
            }
        }
        costumes
    }

    /// Group and format a set of costume changes into proper commits
    pub fn format_costumes(
        &self,
        changes: Vec<CostumeChange>,
        action: &'static str,
    ) -> Vec<(String, String)> {
        let _changes: Vec<(String, String)> = changes
            .iter()
            .map(|change| {
                (
                    change.sprite.to_owned() + if change.on_stage { " (stage)" } else { "" },
                    format!("{} {}", action, change.costume_name),
                )
            })
            .collect();
        let mut commits: HashMap<String, String> = HashMap::new();
        for (sprite, actions) in group_items(_changes) {
            let split_ = actions
                .iter()
                .map(|a| a.split(" ").map(|x| x.to_string()).collect::<Vec<_>>())
                .collect::<Vec<_>>();
            let binding = group_items(split_);
            let act: Vec<(&String, &Vec<String>)> = binding
                .iter()
                .map(|(sprite, changes)| (sprite, changes))
                .collect();
            commits.insert(sprite, format!("{} {}", act[0].0, act[0].1.join(", ")));
        }
        commits.clone().into_iter().map(|(x, y)| (x, y)).collect()
    }

    /// Formats scripts as a flat object representation with opcode, fields, and inputs
    fn format_blocks(blocks: &Map<String, Value>) -> String {
        let re = Regex::new(r#"":\[(?:1|2|3),".*""#).unwrap();
        let top_ids = blocks
            .iter()
            .filter_map(|(id, val)| {
                if val["parent"].is_null() {
                    Some(id)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        let mut statements: Vec<String> = vec![];

        for id in top_ids {
            let mut _blocks: Vec<String> = vec![];
            let mut current_block = &blocks[id];

            loop {
                _blocks.push(format!(
                    "{} {} {}",
                    current_block["opcode"].as_str().unwrap(),
                    serde_json::to_string(current_block["inputs"].as_object().unwrap()).unwrap(),
                    serde_json::to_string(current_block["fields"].as_object().unwrap()).unwrap()
                ));

                let next = &current_block["next"];

                // attempt to find the next block
                match next {
                    // block is directly below
                    Value::String(id) => {
                        let substack = &current_block["inputs"]["SUBSTACK"][1];
                        match substack {
                            Value::String(id) => current_block = &blocks[id],
                            Value::Null => current_block = &blocks[id],
                            _ => unreachable!(),
                        }
                    }
                    // block is located in c-block or e-block
                    Value::Null => {
                        let substack = &current_block["inputs"]["SUBSTACK"][1];
                        match substack {
                            Value::String(id) => current_block = &blocks[id],
                            Value::Null => {
                                break;
                            }
                            _ => unreachable!(),
                        }
                    }
                    _ => unreachable!(),
                }
            }
            statements.push(_blocks.join("\n"));
        }
        statements.sort_by_key(|blocks| blocks.to_lowercase());
        let blocks = re
            .replace_all(&statements.join("\n"), "\":[1,\"\"")
            .to_string();
        blocks
    }

    /// Return all script changes given a newer project
    pub fn blocks<'a>(&'a self, new: &'a Diff) -> Result<Vec<ScriptChanges>> {
        fn _count_blocks(blocks: &Map<String, Value>) -> i32 {
            blocks
                .iter()
                .filter(|block| {
                    block.1["opcode"]
                        .as_str()
                        .is_some_and(|op| !op.ends_with("_menu"))
                })
                .collect::<Vec<_>>()
                .len() as i32
        }

        let sprites = self.data["targets"]
            .as_array()
            .unwrap()
            .iter()
            .zip_longest(new.data["targets"].as_array().unwrap())
            .map(|x| match x {
                Both(a, b) => (a, b),
                Left(a) => (a, &Value::Null),
                Right(b) => (&Value::Null, b),
            });

        let mut error = None;

        let changes = sprites
            .clone()
            .filter_map(|(&ref old, &ref new)| {
                if old["blocks"].as_object() == new["blocks"].as_object() {
                    return None;
                }
                if old.is_null() {
                    return Some(ScriptChanges {
                        sprite: new["name"].as_str().unwrap().to_string(),
                        added: _count_blocks(&new["blocks"].as_object().unwrap()) as usize,
                        removed: 0,
                        on_stage: new["isStage"].as_bool().unwrap(),
                    });
                }
                if new.is_null() {
                    return Some(ScriptChanges {
                        sprite: old["name"].as_str().unwrap().to_string(),
                        added: 0,
                        removed: _count_blocks(old["blocks"].as_object().unwrap()) as usize,
                        on_stage: old["isStage"].as_bool().unwrap(),
                    });
                }

                let diff = git::diff(
                    Diff::format_blocks(old["blocks"].as_object().unwrap()),
                    Diff::format_blocks(new["blocks"].as_object().unwrap()),
                    2000,
                );

                if diff.is_err() {
                    error = Some(diff.unwrap_err());
                    return None;
                };

                let diff = diff.unwrap();

                if diff.added != 0 || diff.removed != 0 {
                    let name = [
                        old["name"].as_str().unwrap(),
                        if old["isStage"].as_bool().unwrap() {
                            " (stage)"
                        } else {
                            ""
                        },
                    ];
                    Some(ScriptChanges {
                        sprite: name.join(""),
                        added: diff.added as usize,
                        removed: diff.removed.abs() as usize,
                        on_stage: new["isStage"].as_bool().unwrap(),
                    })
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        if let Some(error) = error {
            return Err(error);
        }

        Ok(changes)
    }

    /// Create commits for changes from the current project to a newer one
    pub fn commits(&self, new: &Diff) -> Result<Vec<String>> {
        let costume_changes = self._merged_costumes(&new);
        let blocks: Vec<_> = self
            .blocks(&new)?
            .iter()
            .map(|s| {
                s.format()
                    .split(": ")
                    .map(|x| x.to_string())
                    .collect::<Vec<_>>()
            })
            .map(|v| (v[0].clone(), v[1].clone()))
            .collect::<Vec<(String, String)>>();
        let added = self.format_costumes(costume_changes.added, "add");
        let removed = self.format_costumes(costume_changes.removed, "remove");
        let merged = self.format_costumes(costume_changes.merged, "modify");

        let _commits = [blocks, added, removed, merged].concat();

        let commits =
            Vec::from_iter(group_items(_commits).iter().map(|(sprite, changes)| {
                format!("{}: {}", sprite, changes.join(", ").to_string())
            }));

        Ok(commits)
    }
}
