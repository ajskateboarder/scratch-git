use serde::{Deserialize, Serialize};

// Change this when using a different GitHub App
const CLIENT_ID: &str = "Iv23liJFLwawI1z9jc6S";
const INTERVAL: i8 = 2;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceCode {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: i32,
    interval: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessToken {
    access_token: String,
    error: Option<String>,
}

/// Creates a code to authenticate with GitHub's device flow
pub fn device_code() -> DeviceCode {
    minreq::post(format!(
        "https://github.com/login/device/code?client_id={CLIENT_ID}&interval={INTERVAL}"
    ))
    .with_header("Accept", "application/json")
    .send()
    .unwrap()
    .json()
    .unwrap()
}

/// Polls for a user access token
pub fn access_token(code: DeviceCode) -> Option<String> {
    let token: AccessToken = minreq::post(format!("https://github.com/login/oauth/access_token?client_id={CLIENT_ID}&device_code={}&grant_type={}&interval={}&", code.device_code, "urn:ietf:params:oauth:grant-type:device_code", INTERVAL))
    .with_header("Accept", "application/json")
    .send()
    .unwrap().json().unwrap();

    if token.error.is_some() {
        None
    } else {
        Some(token.access_token)
    }
}

/// Gets the username for the logged-in user 
pub fn current_user(token: String) -> String {
    let response: serde_json::Value = minreq::get("https://api.github.com/user")
        .with_header("Accept", "application/vnd.github+json")
        .with_header("Authorization", format!("Bearer {token}"))
        .with_header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .unwrap()
        .json()
        .unwrap();
    response["login"].as_str().unwrap().into()
}
