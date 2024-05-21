use serde::{Deserialize, Serialize};

// Change this when using a different GitHub App
const CLIENT_ID: &'static str = "Iv23liJFLwawI1z9jc6S";

/// Represents a temporary code to use with github.com/login/device
#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceCode {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: i32,
    interval: i32,
}

/// Represents a GitHub user authentication token and possible errors
#[derive(Debug, Serialize, Deserialize)]
pub struct AccessToken {
    access_token: Option<String>,
    error: Option<String>,
}

/// Creates a code to authenticate with GitHub's device flow
pub fn device_code() -> minreq::Response {
    minreq::post(format!(
        "https://github.com/login/device/code?client_id={CLIENT_ID}&interval=5"
    ))
    .with_header("Accept", "application/json")
    .send()
    .unwrap()
}

/// Try to get the user access token
pub fn access_token(code: DeviceCode) -> Option<String> {
    let token: AccessToken = minreq::post(format!(
        "https://github.com/login/oauth/access_token?client_id={CLIENT_ID}&device_code={}&grant_type={}&interval=5",
        code.device_code, "urn:ietf:params:oauth:grant-type:device_code"
    ))
    .with_header("Accept", "application/json")
    .send()
    .unwrap().json().unwrap();

    if token.error.is_some() {
        None
    } else {
        Some(token.access_token.unwrap())
    }
}

/// Gets the username for the logged-in user given an access token
pub fn current_user(token: String) -> Option<String> {
    let response = minreq::get("https://api.github.com/user")
        .with_header("User-Agent", "bot")
        .with_header("Accept", "application/vnd.github+json")
        .with_header("Authorization", format!("Bearer {token}"))
        .with_header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .unwrap();

    if response.status_code == 401 {
        None
    } else {
        Some(
            response.json::<serde_json::Value>().unwrap()["login"]
                .as_str()
                .unwrap()
                .to_string(),
        )
    }
}
