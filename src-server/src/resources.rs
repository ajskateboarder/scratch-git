use actix_web::{
    cookie::{Cookie, SameSite},
    get, post, web, Either, HttpRequest, HttpResponse, Responder,
};
use lazy_static::lazy_static;
use minreq;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env::var;

lazy_static! {
    static ref CLIENT_ID: String = var("GH_CLIENT_ID").unwrap();
    static ref CLIENT_SECRET: String = var("GH_CLIENT_SECRET").unwrap();
    static ref COOKIE_LOC: String = var("COOKIE_LOC").unwrap();
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
            let mut c = Cookie::build("token", token.to_string())
                .domain(COOKIE_LOC.to_string())
                .path("/")
                .secure(true)
                .finish();
            c.set_same_site(SameSite::Strict);
            return Either::Left(
                HttpResponse::Ok()
                    .content_type("text/html; charset=utf-8")
                    .cookie(c)
                    .body("<!DOCTYPE html><script>window.close()</script>"),
            );
        }
    }

    Either::Right(
        HttpResponse::InternalServerError()
            .body("either your code expired or github screwed up. oopsies!! you get to decide"),
    )
}

#[get("/valid_gh_token")]
pub async fn valid_gh_user(req: HttpRequest) -> impl Responder {
    let token = req.headers().get("Token");
    let Some(token) = token else {
        return HttpResponse::BadRequest();
    };

    let response = minreq::get("https://api.github.com/user")
        .with_header("User-Agent", "scratch.git")
        .with_header("Accept", "application/json")
        .with_header(
            "Authorization",
            format!("Bearer {}", token.to_str().unwrap()),
        )
        .send();

    let Ok(response) = response else {
        return HttpResponse::BadRequest();
    };
    if response.status_code != 200 {
        return HttpResponse::BadRequest();
    };

    HttpResponse::Ok()
}

#[derive(Deserialize)]
struct CommitRequest {
    kind: SupportedHosts,
    user: String,
    repo: String,
}

#[post("/commits")]
pub async fn commits(form: web::Json<CommitRequest>) -> impl Responder {
    match form.0.kind {
        SupportedHosts::Github(token) => {
            let response = minreq::get(format!(
                "https://api.github.com/repos/{}/{}/commits",
                form.0.user, form.0.repo
            ))
            .with_header("User-Agent", "scratch.git")
            .with_header("Accept", "application/json")
            .with_header(
                "Authorization",
                format!("Bearer {token}"),
            )
            .send()
            .unwrap();
            let json = response.as_str().unwrap().to_string();
            HttpResponse::Ok().body(json)
        }
        SupportedHosts::ScratchGitGlitch => {
            let response = minreq::get(format!(
                "https://scratchgit.glitch.me/api/v1/repos/{}/{}/commits",
                form.0.user, form.0.repo
            ))
            .with_header("User-Agent", "scratch.git")
            .with_header("Accept", "application/json")
            .send()
            .unwrap();
            let json = response.as_str().unwrap().to_string();
            HttpResponse::Ok().body(json)
        },
    }
}
