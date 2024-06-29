use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use anyhow::{anyhow, Result};
use serde::Serialize;

/// Return a generated blob ID from a string
fn git_object_id(cwd: &PathBuf, content: String) -> Result<String> {
    let mut child = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "git", "hash-object", "-w", "--stdin"]);
        cmd
    } else {
        let mut git = Command::new("git");
        git.args(["hash-object", "-w", "--stdin"]);
        git
    }
    .current_dir(&cwd)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .spawn()?;

    let mut stdin = child
        .stdin
        .take()
        .ok_or(anyhow!("could not receive stdin"))?;

    std::thread::spawn(move || stdin.write_all(&content.as_bytes()).unwrap());
    let output = child.wait_with_output()?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

/// Represents the result of a git diff
#[derive(Serialize, Debug)]
pub struct GitDiff {
    pub removed: i32,
    pub added: i32,
    pub diffed: String,
}

/// Diff two strings, specifically scratchblocks code, using `git diff`
pub fn diff(
    cwd: &PathBuf,
    mut old_content: String,
    mut new_content: String,
    context: i32,
) -> Result<GitDiff> {
    if old_content == new_content {
        return Ok(GitDiff {
            removed: 0,
            added: 0,
            diffed: String::new(),
        });
    }

    if !old_content.ends_with("\n") {
        old_content += "\n";
    }
    if !new_content.ends_with("\n") {
        new_content += "\n";
    }

    let old_id = git_object_id(cwd, old_content.into())?;
    let new_id = git_object_id(cwd, new_content.into())?;

    let proc = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args([
            "/C",
            "git",
            "diff",
            format!("-U{context}").as_str(),
            "--no-color",
            &old_id,
            &new_id,
        ]);
        cmd
    } else {
        let mut git = Command::new("git");
        git.args([
            "diff",
            format!("-U{context}").as_str(),
            "--no-color",
            &old_id,
            &new_id,
        ]);
        git
    }
    .current_dir(cwd)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;

    let output = &proc.wait_with_output()?;
    let output = String::from_utf8_lossy(&output.stdout);

    let binding = &output.trim().split("@@").into_iter().collect::<Vec<_>>()[2..];

    let patched_lines = binding.join("");
    let patched_lines: Vec<_> = patched_lines.split("\n").collect();

    let added = patched_lines
        .iter()
        .filter(|line| line.starts_with("+"))
        .collect::<Vec<_>>()
        .len() as i32;

    let removed = patched_lines
        .iter()
        .filter(|line| line.starts_with("-"))
        .collect::<Vec<_>>()
        .len() as i32;

    let patched = patched_lines
        .iter()
        .map(|line| {
            let split = line.split(" ").collect::<Vec<&str>>();
            if split.len() != 1
                && split[1].starts_with("-")
                && split[2].starts_with("+")
                && split[3] == ""
            {
                return split[4..].join(" ");
            }
            line.to_string()
        })
        .collect::<Vec<String>>()
        .join("\n");

    Ok(GitDiff {
        removed,
        added: added.try_into()?,
        diffed: patched,
    })
}

/// Fetch the revision of a certain file
pub fn show_revision(cwd: &PathBuf, commit: &str) -> Result<String> {
    let proc = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "git", "show", commit]);
        cmd
    } else {
        let mut git = Command::new("git");
        git.args(["show", commit]);
        git
    }
    .current_dir(cwd)
    .output()?;
    Ok(String::from_utf8_lossy(&proc.stdout).to_string())
}

pub fn main_branch(cwd: &PathBuf) -> Result<String> {
    let git_branch = &String::from_utf8(
        run(vec!["branch", "-rl", "*/HEAD"], Some(cwd))
            .output()?
            .stdout,
    )?;
    let main_branch = git_branch.split("origin/").last().ok_or(anyhow!("couldn't find origin. you probably havent setup a repository so why are you pushing?? what???"))?;
    Ok(main_branch
        .strip_suffix("\n")
        .unwrap_or(main_branch)
        .to_string())
}

/// Run a Git command
pub fn run(args: Vec<&str>, cwd: Option<&PathBuf>) -> Command {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        let mut git_args = vec!["/C", "git"];
        git_args.extend(&args);
        cmd.args(git_args);
        cmd
    } else {
        let mut git = Command::new("git");
        git.args(&args);
        git
    };

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    if let Some(cwd) = cwd {
        cmd.current_dir(&cwd);
    }

    cmd
}
