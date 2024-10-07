use actix_web::{
    cookie::{Cookie, SameSite},
    get,
    post,
    web,
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

#[get("/github_auth")]
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
            let mut c = Cookie::build("token", token.to_string()).domain("ajskateboarder.org").path("/").secure(true).finish();
            c.set_same_site(SameSite::Strict);
            return Either::Left(
                HttpResponse::Ok()
		    .content_type("text/html; charset=utf-8")
		    .cookie(c).body("<!DOCTYPE html><meta http-equiv='refresh' content='0;https://scratch-git.ajskateboarder.org'>")
            );
        }
    }

    Either::Right(HttpResponse::InternalServerError().body(""))
}

#[derive(Deserialize)]
struct ParseRequest {
    kind: SupportedHosts,
    user: String,
    repo: String,
}

#[post("/commits")]
pub async fn commits(form: web::Json<ParseRequest>) -> impl Responder {
    match form.0.kind {
        SupportedHosts::Github(token) => HttpResponse::Ok(),
        SupportedHosts::ScratchGitGlitch => HttpResponse::Ok(),
    }
}
