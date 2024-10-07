use actix_web::{
    cookie::Cookie,
    get,
    http::StatusCode,
    post,
    web::{self, Redirect},
    Either, HttpRequest, HttpResponse, Responder,
};
use lazy_static::lazy_static;
use minreq;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env::var;

lazy_static! {
    static ref CLIENT_ID: String = var("GH_CLIENT_ID").unwrap();
    static ref CLIENT_SECRET: String = var("GH_CLIENT_SECRET").unwrap();
}

#[derive(Serialize, Deserialize)]
struct Commit {
    sha: String,
    author: String,
    message: String,
    date: String,
    html_url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum SupportedHosts {
    Github(String),
    ScratchGitGlitch,
}

#[derive(Serialize, Deserialize)]
struct Code {
    code: String,
}

#[derive(Serialize)]
struct AccessToken {
    client_id: String,
    client_secret: String,
    code: String,
}

#[get("/api/github_auth")]
pub async fn github_auth(req: HttpRequest) -> impl Responder {
    let code = &web::Query::<Code>::from_query(req.query_string())
        .unwrap()
        .code;

    let response = minreq::post("https://github.com/login/oauth/access_token")
        .with_header("Accept", "application/json")
        .with_json(&AccessToken {
            client_id: CLIENT_ID.to_string(),
            client_secret: CLIENT_SECRET.to_string(),
            code: code.to_string(),
        })
        .unwrap()
        .send();

    if let Ok(response) = response {
        let json = response.json::<Value>().unwrap();
        if let Some(token) = json.get("access_token") {
            let c = Cookie::build("token", token.to_string()).finish();

            return Either::Left(
                Redirect::to("/")
                    .customize()
                    .add_cookie(&c)
                    .with_status(StatusCode::OK),
            );
        }
    }

    Either::Right(HttpResponse::InternalServerError().body("nope"))
}

#[derive(Deserialize)]
struct ParseRequest {
    kind: SupportedHosts,
    user: String,
    repo: String,
}

#[post("/api/commits")]
pub async fn commits(form: web::Json<ParseRequest>) -> impl Responder {
    match form.0.kind {
        SupportedHosts::Github(token) => HttpResponse::Ok(),
        SupportedHosts::ScratchGitGlitch => HttpResponse::Ok(),
    }
}
