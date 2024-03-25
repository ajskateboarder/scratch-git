use serde_json::{Map, Value};
use std::{
    collections::{BTreeMap, HashMap, HashSet},
    vec,
};

pub trait ItemGrouping {
    fn method(&self) -> HashMap<String, Vec<String>>;
}

impl ItemGrouping for Vec<(String, String)> {
    fn method(&self) -> HashMap<String, Vec<String>> {
        let mut groups: HashMap<String, Vec<String>> = HashMap::new();
        for row in self.iter() {
            if !groups.contains_key::<String>(&row.0) {
                groups.insert(String::from(row.0.clone()), vec![]);
            }
            groups
                .get_mut(&row.0)
                .unwrap()
                .push(String::from(row.1.clone()));
        }
        groups
    }
}

impl ItemGrouping for Vec<Vec<String>> {
    fn method(&self) -> HashMap<String, Vec<String>> {
        let mut groups: HashMap<String, Vec<String>> = HashMap::new();
        for row in self.iter() {
            if !groups.contains_key::<String>(&row[0]) {
                groups.insert(String::from(row[0].clone()), vec![]);
            }
            groups
                .get_mut(&row[0])
                .unwrap()
                .push(String::from(row[1].clone()));
        }
        groups
    }
}

/// Set-intersection of costume changes, because HashSet::intersection sucks
fn intersection(mut sets: Vec<HashSet<CostumeChange>>) -> HashSet<CostumeChange> {
    if sets.is_empty() {
        return HashSet::new();
    }

    if sets.len() == 1 {
        return sets.pop().unwrap();
    }

    let mut result = sets.pop().unwrap();
    result.retain(|item| sets.iter().all(|set| set.contains(item)));
    result
}

fn group_items<T: ItemGrouping>(items: T) -> HashMap<String, Vec<String>> {
    ItemGrouping::method(&items)
}

pub struct Diff {
    data: Value,
}

#[derive(Debug)]
pub struct Changes {
    pub added: Vec<CostumeChange>,
    pub removed: Vec<CostumeChange>,
    pub merged: Vec<CostumeChange>,
}

#[derive(Debug, Eq, Hash, PartialEq, Clone)]
pub struct CostumeChange {
    pub sprite: String,
    pub costume_name: String,
    pub costume_path: String,
    pub on_stage: bool,
}

impl Diff {
    /// Commit generation methods for Scratch project assets and code
    pub fn new(data: Value) -> Self {
        data.get("targets")
            .expect("Provided json should have targets key");
        Self { data }
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
    fn _merged_costumes(&self, new: &Self) -> Changes {
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

        Changes {
            added,
            removed,
            merged: Vec::from_iter(merged),
        }
    }

    /// Return the costume differences between each sprite in two projects
    pub fn costumes(&self, new: &Self) -> Vec<CostumeChange> {
        let mut new_costumes: Vec<CostumeChange> = vec![];
        for (sprite, changed_item) in new._costumes() {
            for costume in changed_item {
                new_costumes.push(CostumeChange {
                    sprite: sprite.clone(),
                    costume_name: costume.0,
                    costume_path: costume.1,
                    on_stage: costume.2,
                })
            }
        }
        let mut old_costumes: Vec<CostumeChange> = vec![];
        for (sprite, changed_item) in self._costumes() {
            for costume in changed_item {
                old_costumes.push(CostumeChange {
                    sprite: sprite.clone(),
                    costume_name: costume.0,
                    costume_path: costume.1,
                    on_stage: costume.2,
                })
            }
        }

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
        action: String,
    ) -> Vec<(String, String)> {
        let _changes: Vec<(String, String)> = changes
            .iter()
            .map(|change| {
                (
                    change.sprite.clone() + if change.on_stage { " (stage)" } else { "" },
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

    /// Return the block number difference between each sprite in two projects.
    ///
    /// `new` param is the Diff object which contains newer changes
    pub fn blocks(&self, new: &Diff) -> Vec<String> {
        let mut commits: Vec<String> = vec![];
        let mr_joe = self._blocks();
        dbg!(&mr_joe);
        dbg!(new._blocks());
        let iterator = mr_joe.values().into_iter().zip(new._blocks());
        for ((old_blocks, _), (sprite, (new_blocks, _))) in iterator {
            if new_blocks - old_blocks != 0 {
                let diff = new_blocks - old_blocks;
                commits.push(format!(
                    "{sprite}: {}{diff} blocks",
                    (if diff > 0 { "+" } else { "" }),
                ))
            }
        }
        commits
    }

    /// Return the current number of blocks per sprite
    ///
    /// Returns an empty BTreeMap if the targets key doesn't exist
    fn _blocks(&self) -> BTreeMap<String, (i32, bool)> {
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

        if let Some(sprites) = self.data["targets"].as_array() {
            sprites
                .iter()
                .map(|x| {
                    (
                        x["name"].as_str().unwrap().to_string()
                            + if x["isStage"].as_bool().unwrap() {
                                " (stage)"
                            } else {
                                ""
                            },
                        (
                            _count_blocks(x["blocks"].as_object().unwrap()),
                            x["isStage"].as_bool().unwrap(),
                        ),
                    )
                })
                .collect::<BTreeMap<_, _>>()
        } else {
            BTreeMap::new()
        }
    }

    /// Create commits for changes from the current project to a newer one
    pub fn commits(&self, new: &Diff) -> Vec<String> {
        let costume_changes = self._merged_costumes(&new);
        let blocks: Vec<_> = self
            .blocks(&new)
            .iter()
            .map(|s| s.split(": ").map(|x| x.to_string()).collect::<Vec<_>>())
            .map(|v| (v[0].clone(), v[1].clone()))
            .collect::<Vec<(String, String)>>();
        let added = self.format_costumes(costume_changes.added, "add".to_string());
        let removed = self.format_costumes(costume_changes.removed, "remove".to_string());
        let merged = self.format_costumes(costume_changes.merged, "modify".to_string());

        let _commits = [blocks, added, removed, merged].concat();
        Vec::from_iter(
            group_items(_commits)
                .iter()
                .map(|(sprite, changes)| format!("{}: {}", sprite, changes.join(", ").to_string())),
        )
    }
}
