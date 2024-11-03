pub mod diff;
pub mod git;
pub mod sb3;
pub mod zipping;

pub mod project_diff;
pub mod resources;

use actix_cors::Cors;
use actix_web::{get, App, HttpResponse, HttpServer, Responder};

use project_diff::project_diff as project_diff_;
use resources::{commits, github_auth, valid_gh_user};

#[get("/")]
async fn root() -> impl Responder {
    return HttpResponse::Ok().body("i am ok");
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "debug");
    env_logger::init();

    HttpServer::new(|| {
        let cors = Cors::default()
            .allowed_origin("https://scratch-git.ajskateboarder.org")
            .allowed_methods(vec!["GET", "POST"])
            .allow_any_header()
            .expose_any_header();

        App::new()
            .wrap(cors)
            .service(root)
            .service(project_diff_)
            .service(commits)
            .service(github_auth)
            .service(valid_gh_user)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
