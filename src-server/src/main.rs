pub mod diff;
pub mod git;
pub mod sb3;
pub mod zipping;

pub mod project_diff;
pub mod resources;

use actix_web::{get, App, HttpResponse, HttpServer, Responder};

use project_diff::project_diff as project_diff_;
use resources::{commits, github_auth};

#[get("/status")]
async fn root() -> impl Responder {
    return HttpResponse::Ok().body("i am ok");
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "debug");
    env_logger::init();

    HttpServer::new(|| {
        App::new()
            .service(root)
            .service(project_diff_)
            .service(commits)
            .service(github_auth)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
