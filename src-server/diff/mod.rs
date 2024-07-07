pub mod structs;
pub mod vec_utils;

use structs::*;

use std::path::PathBuf;
use std::{
    collections::{HashMap, HashSet},
    vec,
};

use anyhow::Result;
use itertools::EitherOrBoth::{Both, Left, Right};
use itertools::Itertools;
use regex_static::{once_cell::sync::Lazy, Regex};
use serde_json::{Map, Value};

use crate::git;
use vec_utils::{group_items, intersect_costumes};

// removes ids from block statements to make diffs accurate
static REMOVE_IDS: Lazy<Regex> = regex_static::lazy_regex!(r#"":\[(?:1|2|3),"\w""#);

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
    pub fn get_asset_path(costume: Value) -> String {
        costume["md5ext"]
            .as_str()
            .map(|md5| md5.to_string())
            .unwrap_or(format!(
                "{}.{}",
                costume["assetId"].as_str().unwrap(),
                costume["dataFormat"].as_str().unwrap()
            ))
    }

    /// Return costumes that have changed between projects, but not added or removed
    fn _merged_costumes<'a>(&'a self, new: &'a Self) -> AssetChanges {
        let mut added = self.assets(new, None);
        let mut removed = new.assets(self, None);

        let _m1 = added.iter().map(|x| x.to_owned()).collect::<HashSet<_>>();
        let _m2 = removed
            .iter()
            .map(|x| x.to_owned())
            .collect::<HashSet<_>>()
            .to_owned();

        let merged = intersect_costumes(vec![_m1, _m2]);

        let they_match =
            |a: &AssetChange, b: &AssetChange| a.name == b.name && a.sprite == b.sprite;

        for item in &merged {
            if let Some(pos) = added.iter().position(|x| they_match(x, item)) {
                added.remove(pos);
            }
        }
        for item in &merged {
            if let Some(pos) = removed.iter().position(|x| they_match(x, item)) {
                removed.remove(pos);
            }
        }

        AssetChanges {
            added,
            removed,
            merged: Vec::from_iter(merged),
        }
    }

    /// Return the costume differences between each sprite in two projects
    // `kind` is used to mark changes as a certain type for frontend purposes
    pub fn assets(&self, new: &Self, kind: Option<AssetChangeType>) -> Vec<AssetChange> {
        let new_assets: Vec<AssetChange> = new
            ._assets()
            .into_iter()
            .map(|(sprite, changes)| {
                changes
                    .iter()
                    .map(|costume| AssetChange {
                        sprite: sprite.clone(),
                        name: costume.0.clone(),
                        path: costume.2.clone(),
                        ext: costume.1.clone(),
                        on_stage: costume.3,
                        contents: None,
                        kind,
                    })
                    .collect::<Vec<AssetChange>>()
            })
            .flatten()
            .collect();

        let old_assets: Vec<AssetChange> = self
            ._assets()
            .into_iter()
            .map(|(sprite, changes)| {
                changes
                    .iter()
                    .map(|costume| AssetChange {
                        sprite: sprite.clone(),
                        name: costume.0.clone(),
                        path: costume.2.clone(),
                        ext: costume.1.clone(),
                        on_stage: costume.3,
                        contents: None,
                        kind,
                    })
                    .collect::<Vec<AssetChange>>()
            })
            .flatten()
            .collect();

        let _old_set = HashSet::from_iter(old_assets);
        let _new_set = HashSet::<AssetChange>::from_iter(new_assets.clone());
        let difference: _ = Vec::from_iter(_new_set.difference(&_old_set));
        new_assets
            .into_iter()
            .filter(|x| difference.contains(&x))
            .collect()
    }

    /// Return the path to every costume being used
    fn _assets(&self) -> HashMap<String, Vec<(String, String, String, bool)>> {
        let mut assets: HashMap<String, Vec<(String, String, String, bool)>> = HashMap::new();
        if let Some(sprites) = self.data["targets"].as_array() {
            for sprite in sprites {
                if let Some(sprite_costumes) = sprite["costumes"].as_array() {
                    assets.insert(
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
                                    costume["dataFormat"].as_str().unwrap().to_string(),
                                    Diff::get_asset_path(costume.clone()),
                                    sprite["isStage"].as_bool().unwrap(),
                                )
                            })
                            .collect(),
                    );
                }
                if let Some(sprite_sounds) = sprite["sounds"].as_array() {
                    assets
                        .get_mut(
                            &(sprite["name"].as_str().unwrap().to_string()
                                + if sprite["isStage"].as_bool().unwrap() {
                                    " (stage)"
                                } else {
                                    ""
                                }),
                        )
                        .unwrap()
                        .extend(
                            sprite_sounds
                                .iter()
                                .map(|sound| {
                                    (
                                        sound["name"].as_str().unwrap().to_string(),
                                        sound["dataFormat"].as_str().unwrap().to_string(),
                                        Diff::get_asset_path(sound.clone()),
                                        sprite["isStage"].as_bool().unwrap(),
                                    )
                                })
                                .collect::<Vec<_>>(),
                        );
                }
            }
        }
        assets
    }

    /// Group and format a set of asset changes into proper commits
    pub fn format_assets(
        &self,
        changes: Vec<AssetChange>,
        action: &'static str,
    ) -> Vec<(String, String)> {
        let _changes: Vec<(String, String)> = changes
            .iter()
            .map(|change| {
                (
                    change.sprite.to_owned() + if change.on_stage { " (stage)" } else { "" },
                    format!("{} {}.{}", action, change.name, change.ext),
                )
            })
            .collect();
        let mut commits: HashMap<String, String> = HashMap::new();
        for (sprite, actions) in group_items(_changes) {
            let split_ = actions
                .iter()
                .map(|a| {
                    let parts = a.split_at(a.match_indices(" ").nth(0).unwrap().0);
                    (parts.0.to_string(), parts.1.to_string())
                })
                .collect::<Vec<_>>();

            let binding = group_items(split_);
            let act: Vec<(&String, &Vec<String>)> = binding
                .iter()
                .map(|(sprite, changes)| (sprite, changes))
                .collect();
            commits.insert(sprite, format!("{} {}", act[0].0, act[0].1.join(", ")));
        }
        commits.into_iter().map(|(x, y)| (x, y)).collect()
    }

    /// Formats scripts as a flat object representation with opcode, fields, and inputs
    fn format_blocks(blocks: &Map<String, Value>) -> String {
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
                let inputs =
                    serde_json::to_string(current_block["inputs"].as_object().unwrap()).unwrap();
                let mut _reporters = vec![];
                let mut current_reporter = inputs;

                // dirty hack to fetch inner reporters
                loop {
                    if let Some(mat) = REMOVE_IDS.find(&current_reporter) {
                        let seg = &current_reporter[mat.start()..mat.end()];
                        let seg = seg.split(",").nth(1).unwrap().replace("]}", "");

                        let next_block = &blocks[&seg[1..seg.len() - 1]];
                        let next_inputs =
                            serde_json::to_string(next_block["inputs"].as_object().unwrap())
                                .unwrap();
                        let next_opcode = next_block["opcode"].as_str().unwrap();
                        let next_fields =
                            serde_json::to_string(next_block["fields"].as_object().unwrap())
                                .unwrap();

                        _reporters.push(format!("{} {} {}", next_opcode, next_inputs, next_fields));
                        current_reporter = next_inputs;
                    } else {
                        break;
                    };
                }

                _blocks.push(format!(
                    "{} {} {} {}",
                    current_block["opcode"].as_str().unwrap(),
                    serde_json::to_string(current_block["inputs"].as_object().unwrap()).unwrap(),
                    serde_json::to_string(current_block["fields"].as_object().unwrap()).unwrap(),
                    _reporters.join(" ")
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
                                _blocks.push("".into());
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

        let blocks = &mut statements.join("\n");
        REMOVE_IDS.replace_all(blocks, "\":[1,\"\"").to_string()
    }

    /// Return all script changes given a newer project
    pub fn blocks<'a>(&'a self, cwd: &PathBuf, new: &'a Diff) -> Result<Vec<ScriptChanges>> {
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

                let old_content = Diff::format_blocks(old["blocks"].as_object().unwrap());
                let new_content = Diff::format_blocks(new["blocks"].as_object().unwrap());
                println!("{}", &old_content);
                println!("\n{}", &new_content);

                let diff = git::diff(cwd, old_content, new_content, 2000);

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
    pub fn commits(&self, cwd: &PathBuf, new: &Diff) -> Result<Vec<String>> {
        let costume_changes = self._merged_costumes(&new);
        let blocks: Vec<_> = self
            .blocks(cwd, &new)?
            .iter()
            .map(|s| {
                s.format()
                    .split(": ")
                    .map(|x| x.to_string())
                    .collect::<Vec<_>>()
            })
            .map(|v| (v[0].clone(), v[1].clone()))
            .collect::<Vec<(String, String)>>();

        let added = self.format_assets(costume_changes.added, "add");
        let removed = self.format_assets(costume_changes.removed, "remove");
        let merged = self.format_assets(costume_changes.merged, "modify");

        let _commits = [blocks, added, removed, merged].concat();

        let commits =
            Vec::from_iter(group_items(_commits).iter().map(|(sprite, changes)| {
                format!("{}: {}", sprite, changes.join(", ").to_string())
            }));

        Ok(commits)
    }
}
