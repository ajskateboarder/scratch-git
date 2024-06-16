use crate::zipping;

const ASSET_HOST: &'static str = "https://assets.scratch.mit.edu/internalapi/asset/{sha}/get/";
const API_HOST: &'static str = "https://api.scratch.mit.edu";

pub enum Asset {
    Text(String),
    Buffer(Box<[u8]>)
}

pub fn get_asset(sha: String) -> Result<Asset, &'static str> {
    let request = minreq::get(ASSET_HOST.replace("{sha}", &sha));
    if let Ok(response) = request.send() {
        return if let Ok(str) = response.as_str() {
            Ok(Asset::Text(str.into()))
        } else {
            Ok(Asset::Buffer(response.as_bytes().into()))
        };
    } else {
        Err("failed to request asset")
    }
}

pub fn get_project_json(id: i64) -> Result<String, &'static str> {
    let request = minreq::get(format!("{API_HOST}/projects/{id}"));
    if let Ok(response) = request.send() {
        return if response.status_code != 200 {
            let token = &response.json::<serde_json::Value>().unwrap()["project_token"];
            todo!()
        } else {
            Err("failed to request project")
        }
    } else {
        Err("failed to request project metadata")
    }
}
