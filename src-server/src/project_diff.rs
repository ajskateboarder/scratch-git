use std::{
    io::{Read, Write},
    path::PathBuf,
    process::{Command, Stdio},
    vec,
};

use actix_multipart::form::tempfile::TempFile;
use actix_multipart::form::MultipartForm;
use actix_web::{post, HttpResponse, Responder};

use itertools::{
    EitherOrBoth::{Both, Left, Right},
    Itertools,
};
use serde_json::{json, to_string, Value};

use crate::zipping::extract;
use crate::{diff::structs::Diff, sb3::Target};
use crate::{git::diff, sb3::ProjectData};

const MAX_FILE_SIZE: u64 = 50000000; // 50mb

fn get_sb3_changes(old_json: String, new_json: String) -> String {
    let mut child = Command::new("node")
        .args(["main.cjs"])
        .current_dir(PathBuf::from("./src/sb3-parser"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    let mut child_stdin = child.stdin.take();
    child_stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{old_json}\r\n{new_json}").as_bytes())
        .unwrap();
    drop(child_stdin);
    String::from_utf8(child.wait_with_output().unwrap().stdout).unwrap()
}

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
    let old_project_json = serde_json::from_str::<ProjectData>(&buf);

    if project_json.is_err() {
        return HttpResponse::BadRequest().body(format!("old json could not be parsed as string"));
    }
    if old_project_json.is_err() {
        return HttpResponse::BadRequest().body(format!("invalid old json"));
    };

    let mut new_archive = zip::ZipArchive::new(form.0.new.file).unwrap();
    let mut buf = String::new();
    let project_str = new_archive
        .by_name("project.json")
        .unwrap()
        .read_to_string(&mut buf);
    let new_project_json = serde_json::from_str::<ProjectData>(&buf);

    if project_str.is_err() {
        return HttpResponse::BadRequest().body(format!("new json could not be parsed as string"));
    }
    if new_project_json.is_err() {
        return HttpResponse::BadRequest().body(format!("invalid new json"));
    };

    let e = old_project_json.unwrap().targets.into_iter();
    let f = new_project_json.unwrap().targets.into_iter();

    let g = e.zip_longest(f).map(|f| match f {
        Both(a, b) => (a, b),
        Left(a) => (
            a,
            Target {
                name: None,
                costumes: vec![],
                sounds: vec![],
                blocks: json!({}),
            },
        ),
        Right(b) => (
            Target {
                name: None,
                costumes: vec![],
                sounds: vec![],
                blocks: json!({}),
            },
            b,
        ),
    });

    let mut changes = json!({});
    for (old, new) in g {
        if old.name.clone().is_some()
            && new
                .name
                .is_some_and(|name| name == old.name.clone().unwrap())
        {
            let single_changes: Value = serde_json::from_str(&get_sb3_changes(
                to_string(&old.blocks).unwrap(),
                to_string(&new.blocks).unwrap(),
            ))
            .unwrap();
            let single_changes: Vec<_> = single_changes.as_array().unwrap().into_iter().map(|v| {
                let new_content = v["newContent"].as_str().unwrap();
                let old_content = v["oldContent"].as_str().unwrap();
                let script_no = v["scriptNo"].as_i64().unwrap();

                json!({
                    "old_content": old_content,
                    "new_content": new_content,
                    "script_no": script_no,
                    "diffed": diff(&"./scratch-space".into(), old_content.into(), new_content.into(), 10000).unwrap()
                })
            }).collect();
            changes[old.name.clone().unwrap()] = Value::Array(single_changes);
        }
    }

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
            .join(","), "changes": changes})
        .to_string(),
    )
}
