pub mod config;
pub mod diff;
pub mod gh_auth;
pub mod git;
pub mod handlers;
pub mod sb3;
pub mod tw_path;
pub mod zipping;

use std::{
    env, fs,
    io::{stdin, BufRead},
    net::{TcpListener, TcpStream},
    path::PathBuf,
    process::exit,
    thread::spawn,
};

use serde_json::{from_str, json};
use tungstenite::{accept, Error, HandshakeError, Message, Result};

use crate::handlers::{handle_command, Cmd};
use crate::tw_path::turbowarp_path;

fn handle_client(stream: TcpStream, debug: bool) -> Result<()> {
    let mut socket = accept(stream).map_err(|err| match err {
        HandshakeError::Interrupted(_) => panic!("Bug: blocking socket would block"),
        HandshakeError::Failure(f) => f,
    })?;

    loop {
        match socket.read()? {
            msg @ Message::Text(_) | msg @ Message::Binary(_) => {
                let msg = msg.to_string();
                if debug {
                    println!("<- Received message: {}", msg.to_string());
                }
                let cmd = from_str::<Cmd>(&msg).unwrap();
                handle_command(cmd, &mut socket, debug).unwrap_or_else(|err| {
                    socket
                        .send(Message::Text(
                            json!({"unhandled-error": err.to_string()}).to_string(),
                        ))
                        .unwrap()
                });
            }
            Message::Ping(_) | Message::Pong(_) | Message::Close(_) | Message::Frame(_) => {}
        }
    }
}

fn main() {
    let path = match turbowarp_path() {
        Some(path) => path,
        None => {
            println!("Failed to find TurboWarp path automatically. Please paste the correct path from the following: \n\thttps://github.com/TurboWarp/desktop#advanced-customizations");
            PathBuf::from(stdin().lock().lines().next().unwrap().unwrap())
        }
    };

    let debug = if let Some(arg) = env::args().nth(1) {
        arg == "--debug"
    } else {
        false
    };

    if let Err(e) = fs::copy("userscript.js", path.join("userscript.js")) {
        println!("Error: {}", e);
        exit(1);
    }
    println!("Script copied to {}", path.to_str().unwrap());

    let _ = fs::create_dir("projects");
    let server = TcpListener::bind("127.0.0.1:8000").unwrap();
    println!(
        "Open TurboWarp Desktop to begin using scratch.git, and make sure to keep this running!"
    );

    for stream in server.incoming() {
        spawn(move || match stream {
            Ok(stream) => {
                if let Err(err) = handle_client(stream, debug) {
                    match err {
                        Error::ConnectionClosed | Error::Protocol(_) | Error::Utf8 => (),
                        e => panic!("{e}"),
                    }
                }
            }
            Err(_) => (),
        });
    }
}
