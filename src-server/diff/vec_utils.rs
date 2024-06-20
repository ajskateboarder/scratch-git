use std::{
    collections::{HashMap, HashSet},
    hash::Hash,
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

/// Set-intersection of costume changes because HashSet::intersection sucks
pub fn intersection<T>(mut sets: Vec<HashSet<T>>) -> HashSet<T>
where
    T: Eq + Hash,
{
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

pub fn group_items<T: ItemGrouping>(items: T) -> HashMap<String, Vec<String>> {
    ItemGrouping::method(&items)
}
