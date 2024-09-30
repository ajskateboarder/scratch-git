use actix_web::{error, post, web, App, HttpResponse, HttpServer, Responder, Error};
use futures::StreamExt;
use sb3::get_assets;
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub mod git;
pub mod diff;
pub mod sb3;

use crate::diff::structs::Diff;
use crate::sb3::ProjectData;

#[derive(Serialize, Deserialize)]
struct DiffRequest {
    old_json: String,
    new_json: String,
}

#[post("/diff_json")]
async fn diff_json(mut payload: web::Payload) -> Result<HttpResponse, Error> {
    let mut body = web::BytesMut::new();
    while let Some(chunk) = payload.next().await {
        let chunk = chunk?;
        body.extend_from_slice(&chunk);
    };
    let obj = serde_json::from_slice::<DiffRequest>(&body)?;

    
    let old_diff_assets = serde_json::from_str::<ProjectData>(&obj.new_json);
    if old_diff_assets.is_err() {
        return Err(error::ErrorBadRequest("old_json is invalid json"));
    }
    let old_diff_assets = old_diff_assets.unwrap();
    
    let new_diff_assets = serde_json::from_str::<ProjectData>(&obj.new_json);
    if new_diff_assets.is_err() {
        return Err(error::ErrorBadRequest("new_json is invalid json"));
    };
    let new_diff_assets = new_diff_assets.unwrap();

    let old_diff = serde_json::from_str::<Value>(&obj.old_json)?;
    let new_diff = serde_json::from_str::<Value>(&obj.new_json)?;

    // get_assets(new)
    // Diff::new(&old_json).commits(, new)

    todo!()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().service(diff_json)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}