#[macro_use]
extern crate rocket;

pub mod application;
pub mod diff;
pub mod projects;

use application::create_app;
use rocket::{Build, Rocket};

#[launch]
fn app() -> Rocket<Build> {
    create_app()
}
