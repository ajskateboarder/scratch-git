#[macro_use]
extern crate rocket;

pub mod application;
pub mod diff;
pub mod projects;

use application::create_app;
use rocket::{Build, Rocket};
use std::fs;

#[launch]
fn app() -> Rocket<Build> {
    let _ = fs::create_dir("projects");
    create_app()
}
