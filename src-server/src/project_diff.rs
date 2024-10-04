use std::{io::{Read, Write}, path::PathBuf, process::{Command, Stdio}, thread};

use crate::diff::structs::Diff;
use crate::sb3::ProjectData;
use crate::zipping::extract;

use actix_multipart::form::tempfile::TempFile;
use actix_multipart::form::MultipartForm;
use actix_web::{post, HttpResponse, Responder};

use serde_json::json;

const MAX_FILE_SIZE: u64 = 50000000; // 50mb

#[derive(MultipartForm)]
struct DiffRequest {
    old: TempFile,
    new: TempFile,
}

#[post("/project_diff")]
pub async fn project_diff(form: MultipartForm<DiffRequest>) -> impl Responder {
    // validation
    if form.0.old.size as u64 > MAX_FILE_SIZE || form.0.new.size as u64 > MAX_FILE_SIZE {
        return HttpResponse::BadRequest()
            .body(format!("file size is too large, max is {MAX_FILE_SIZE}"));
    }

    let mut old_archive = zip::ZipArchive::new(form.0.old.file).unwrap();

    let mut buf = String::new();
    let project_json = old_archive
        .by_name("project.json")
        .unwrap()
        .read_to_string(&mut buf);

    if project_json.is_err() {
        return HttpResponse::BadRequest().body(format!("old json could not be parsed as string"));
    }
    if serde_json::from_str::<ProjectData>(&buf).is_err() {
        return HttpResponse::BadRequest().body(format!("invalid old json"));
    };

    let mut new_archive = zip::ZipArchive::new(form.0.new.file).unwrap();
    let mut buf = String::new();
    let project_str = new_archive
        .by_name("project.json")
        .unwrap()
        .read_to_string(&mut buf);
    let project_json = serde_json::from_str::<ProjectData>(&buf);

    if project_str.is_err() {
        return HttpResponse::BadRequest().body(format!("new json could not be parsed as string"));
    }
    if project_json.is_err() {
        return HttpResponse::BadRequest().body(format!("invalid new json"));
    };

    let e = &project_json.unwrap().targets[1].blocks.to_string();
    dbg!(e);

    let mut child = Command::new("node").args(["src/sb3-parser/main.js"])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).spawn().unwrap();
    let mut child_stdin = child.stdin.take();
    child_stdin.as_mut().unwrap().write_all(format!("b,{e}").as_bytes()).unwrap();
    drop(child_stdin);
    dbg!(child.wait_with_output().unwrap());
    // end validation

    let cwd: PathBuf = "./scratch-space".into();

    let _ = Command::new("rm").args(["-rf", "scratch-space"]).output();
    let _ = Command::new("mkdir").args(["scratch-space"]).output();
    let _ = Command::new("git")
        .args(["init"])
        .current_dir(&cwd)
        .output();

    extract(old_archive, "./scratch-space".into(), MAX_FILE_SIZE).unwrap();

    let _ = Command::new("git")
        .args(["add", "."])
        .current_dir(&cwd)
        .output();
    let _ = Command::new("git")
        .args(["commit", "-m", "commit a"])
        .current_dir(&cwd)
        .output();

    extract(new_archive, "./scratch-space".into(), MAX_FILE_SIZE).unwrap();

    let _ = Command::new("git")
        .args(["add", "."])
        .current_dir(&cwd)
        .output();
    let _ = Command::new("git")
        .args(["commit", "-m", "commit b"])
        .current_dir(&cwd)
        .output();

    let old_diff = Diff::from_revision(&cwd, "HEAD~1:project.json").unwrap();
    let new_diff = Diff::from_revision(&cwd, "HEAD:project.json").unwrap();

    HttpResponse::Ok().body(
        json!({"commit": old_diff
            .commits(&cwd, &new_diff)
            .unwrap()
            .join(",")})
        .to_string(),
    )
}
