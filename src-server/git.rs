use serde::Serialize;
use std::error::Error;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

/// Return a generated blob ID from a string
fn git_object_id(content: String) -> Result<String, Box<dyn Error>> {
    let mut child = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "git", "hash-object", "-w", "--stdin"]);
        cmd
    } else {
        let mut git = Command::new("git");
        git.args(["hash-object", "-w", "--stdin"]);
        git
    }
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .spawn()?;

    let stdin = child.stdin.take();
    if stdin.is_none() {
        return Err("could not receive stdin".into());
    }
    let mut stdin = stdin.unwrap();

    std::thread::spawn(move || stdin.write_all(&content.as_bytes()).unwrap());
    let output = child.wait_with_output()?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

#[derive(Serialize, Debug)]
pub struct GitDiff {
    pub removed: i32,
    pub added: i32,
    pub diffed: String,
}

/// Diff two strings, specifically scratchblocks code, using `git diff`
pub fn diff(
    mut old_content: String,
    mut new_content: String,
    context: i32,
) -> Result<GitDiff, Box<dyn Error>> {
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

    let old_id = git_object_id(old_content.into())?;
    let new_id = git_object_id(new_content.into())?;

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
    .stdout(Stdio::piped())
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
pub fn show_revision(cwd: &PathBuf, commit: &str) -> Result<String, Box<dyn Error>> {
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
