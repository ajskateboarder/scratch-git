use super::AssetChange;
use std::collections::{HashMap, HashSet};

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

/// Set-intersection of costume changes because HashSet::intersection sucks
///
/// Returns costumes present in all sets that have the same costume name and original sprite.
/// Paths are ignored since they can change on save
pub fn intersect_costumes(mut sets: Vec<HashSet<AssetChange>>) -> HashSet<AssetChange> {
    if sets.is_empty() {
        return HashSet::new();
    }
    if sets.len() == 1 {
        return sets.pop().unwrap();
    }

    let mut result = sets.pop().unwrap();
    result.retain(|item| {
        sets.iter().all(|set| {
            set.iter()
                .any(|x| x.name == item.name && x.sprite == item.sprite)
        })
    });
    result
}

pub fn group_items<T: ItemGrouping>(items: T) -> HashMap<String, Vec<String>> {
    ItemGrouping::method(&items)
}

/// Group costumes by their sprite and costumes changes for each sprite by costume name
pub fn group_costumes(
    items: Vec<AssetChange>,
) -> HashMap<String, HashMap<String, Vec<AssetChange>>> {
    let mut groups: HashMap<String, HashMap<String, Vec<AssetChange>>> = HashMap::new();

    for item in items.iter() {
        let inner_map = groups
            .entry(item.sprite.clone())
            .or_insert_with(HashMap::new);
        let changes = inner_map.entry(item.name.clone()).or_insert_with(Vec::new);
        changes.push(item.clone())
    }

    groups
}
