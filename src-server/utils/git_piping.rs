use serde::Serialize;
use std::io::Write;
use std::process::{Command, Stdio};

/// Return a generated blob ID from a string
fn git_object_id(content: String) -> String {
    let mut child = Command::new("git")
        .args(["hash-object", "-w", "--stdin"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to open git hash-object");
    let mut stdin = child.stdin.take().expect("failed to open stdin");
    std::thread::spawn(move || {
        stdin
            .write_all(&content.as_bytes())
            .expect("failed to pipe to stdin");
    });
    let output = child.wait_with_output().expect("failed to read stdout");
    String::from_utf8_lossy(&output.stdout).trim().to_owned()
}

#[derive(Serialize, Debug)]
pub struct GitDiff {
    pub removed: i32,
    pub added: i32,
    pub diffed: String,
}

/// Diff two strings, specifically scratchblocks code, using `git diff`
pub fn git_diff(mut old_content: String, mut new_content: String) -> GitDiff {
    if old_content == new_content {
        return GitDiff {
            removed: 0,
            added: 0,
            diffed: String::new(),
        };
    }
    if !old_content.ends_with("\n") {
        old_content += "\n";
    }
    if !new_content.ends_with("\n") {
        new_content += "\n";
    }
    let proc = Command::new("git")
        .args([
            "diff",
            "--no-color",
            &git_object_id(old_content.into()),
            &git_object_id(new_content.into()),
        ])
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to run git diff");
    let output = proc
        .wait_with_output()
        .expect("failed to access output (?)");
    let binding = &String::from_utf8_lossy(&output.stdout).trim().to_owned();
    let result = &binding.split("@@").into_iter().collect::<Vec<_>>()[1..3];
    let binding = result[0].to_string();
    let add_rms = binding
        .trim()
        .split(" ")
        .into_iter()
        .map(|x| x.split(",").collect::<Vec<_>>()[0])
        .collect::<Vec<_>>();
    GitDiff {
        removed: add_rms[0].parse::<i32>().unwrap(),
        added: add_rms[1].parse::<i32>().unwrap(),
        diffed: result[1].to_string(),
    }
}
