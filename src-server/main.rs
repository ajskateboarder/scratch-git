pub mod diff;
pub mod git;
pub mod sb3;
pub mod zipping;

use std::{io::Read, process::Command};

use actix_multipart::form::tempfile::TempFile;
use actix_multipart::form::MultipartForm;
use actix_web::{post, App, HttpResponse, HttpServer, Responder};

use diff::structs::Diff;
use sb3::ProjectData;
use zipping::extract;

const MAX_FILE_SIZE: usize = 50000000;

#[derive(MultipartForm)]
struct DiffRequest {
    old_project: TempFile,
    new_project: TempFile,
}

#[post("/diff_json")]
async fn diff_json(form: MultipartForm<DiffRequest>) -> impl Responder {
    // validation
    if form.0.old_project.size > MAX_FILE_SIZE || form.0.new_project.size > MAX_FILE_SIZE {
        return HttpResponse::BadRequest()
                .body(format!("file size is too large, max is {MAX_FILE_SIZE}"));
    }

    let mut old_archive = zip::ZipArchive::new(form.0.old_project.file).unwrap();

    let mut buf = String::new();
    let project_json = old_archive.by_name("project.json").unwrap().read_to_string(&mut buf);

    if project_json.is_err() {
        return HttpResponse::BadRequest()
                .body(format!("old json could not be parsed as string"));
    }
    if serde_json::from_str::<ProjectData>(&buf).is_err() {
        return HttpResponse::BadRequest()
                .body(format!("invalid old json"));
    };

    let mut new_archive = zip::ZipArchive::new(form.0.new_project.file).unwrap();
    let mut buf = String::new();
    let project_json = new_archive.by_name("project.json").unwrap().read_to_string(&mut buf);

    if project_json.is_err() {
        return HttpResponse::BadRequest()
                .body(format!("new json could not be parsed as string"));
    }
    if serde_json::from_str::<ProjectData>(&buf).is_err() {
        return HttpResponse::BadRequest()
                .body(format!("invalid new json"));
    };
    // end validation

    let _ = Command::new("rm").args(["-rf", "scratch-space"]).output();
    let _ = Command::new("mkdir").args(["scratch-space"]).output();
    let _ = Command::new("git").args(["init"]).current_dir::<String>("./scratch-space".into()).output();

    extract(old_archive, "./scratch-space".into()).unwrap();

    let _ = Command::new("git").args(["add", "."]).current_dir::<String>("./scratch-space".into()).output();
    let _ = Command::new("git").args(["commit", "-m", "commit a"]).current_dir::<String>("./scratch-space".into()).output();

    extract(new_archive, "./scratch-space".into()).unwrap();

    let _ = Command::new("git").args(["add", "."]).current_dir::<String>("./scratch-space".into()).output();
    let _ = Command::new("git").args(["commit", "-m", "commit b"]).current_dir::<String>("./scratch-space".into()).output();

    let old_diff = Diff::from_revision(&"./scratch-space".into(), "HEAD~1:project.json").unwrap();
    let new_diff = Diff::from_revision(&"./scratch-space".into(), "HEAD:project.json").unwrap();
    
    HttpResponse::Ok().body(old_diff.commits(&"./scratch-space".into(), &new_diff).unwrap().join(", "))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(diff_json))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
